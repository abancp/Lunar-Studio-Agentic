import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { WebSocketServer, WebSocket } from 'ws';
import { logger, getLogPath } from './log.js';
import * as config from './cli/config.js';
import { createLLM } from '../llm/factory.js';
import { WhatsAppService } from '../external-apps/whatsapp.js';
import { createLunarStudioTools } from '../external-apps/lunar_studio.js';
import { tools, getTool } from '../tools/index.js';
import { HistoryManager } from './cli/history.js';
import { buildSystemPrompt } from '../llm/system.js';
import { MemoryManager } from './memory.js';
import type { LLMProvider, Tool } from '../llm/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

// ── WebSocket Message Types ──

interface ClientMessage {
    type: 'chat' | 'stop' | 'get_status' | 'get_logs' | 'get_memories' | 'get_tools' | 'get_config' | 'update_config'
    | 'get_sessions' | 'get_history' | 'clear_history' | 'pop_history' | 'upload_file';
    message?: string;
    config?: { key: string; value: any };
    chatId?: string;
    // upload_file fields
    fileName?: string;
    mimeType?: string;
    data?: string; // base64
}

interface ServerMessage {
    type: 'text' | 'tool_start' | 'tool_result' | 'done' | 'error' | 'status' | 'welcome'
    | 'logs' | 'log_line' | 'memories' | 'tools_list' | 'config' | 'config_updated'
    | 'sessions' | 'history' | 'history_cleared' | 'history_popped'
    | 'file' | 'notify' | 'upload_ok';
    [key: string]: any;
}

// ── Temp upload store ──
// Maps fileId → { path, name, mimeType } per server lifetime
const uploadedFiles = new Map<string, { path: string; name: string; mimeType: string }>();

function saveUploadedFile(fileName: string, mimeType: string, base64Data: string): string {
    const fileId = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const ext = path.extname(fileName) || '';
    const tmpPath = path.join(os.tmpdir(), `${fileId}${ext}`);
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(tmpPath, buffer);
    uploadedFiles.set(fileId, { path: tmpPath, name: fileName, mimeType });
    logger.info(`File uploaded from app: ${fileName} → ${tmpPath} (id: ${fileId})`);
    return fileId;
}

// ── MIME Types ──

const MIME_TYPES: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.webp': 'image/webp',
};

// ── WebServer Class ──

export class WebServer {
    private server: http.Server;
    private wss: WebSocketServer;
    private port: number;
    private staticDir: string;
    private memoryManager: MemoryManager;
    private whatsapp?: WhatsAppService;

    constructor(port: number = 3210, whatsapp?: WhatsAppService) {
        this.port = port;
        this.whatsapp = whatsapp;
        this.memoryManager = new MemoryManager();

        // Resolve static dir to web/dist relative to project root
        this.staticDir = path.resolve(
            path.dirname(new URL(import.meta.url).pathname),
            '../../web/dist'
        );

        // Create HTTP server for static files
        this.server = http.createServer((req, res) => {
            this.handleHTTP(req, res);
        });

        // Create WebSocket server on the same HTTP server
        this.wss = new WebSocketServer({ server: this.server });
        this.wss.on('connection', (ws) => this.handleConnection(ws));
    }

    // ── HTTP Static File Server ──

    private handleHTTP(req: http.IncomingMessage, res: http.ServerResponse) {
        let urlPath = req.url || '/';
        urlPath = urlPath.split('?')[0]!;

        // ── Serve uploaded files ──
        // GET /uploads/:fileId
        const uploadMatch = urlPath.match(/^\/uploads\/([^/]+)$/);
        if (uploadMatch) {
            const fileId = uploadMatch[1]!;
            const entry = uploadedFiles.get(fileId);
            if (!entry || !fs.existsSync(entry.path)) {
                res.writeHead(404);
                res.end('File not found');
                return;
            }
            res.writeHead(200, {
                'Content-Type': entry.mimeType,
                'Content-Disposition': `attachment; filename="${encodeURIComponent(entry.name)}"`,
                'Access-Control-Allow-Origin': '*',
            });
            fs.createReadStream(entry.path).pipe(res);
            return;
        }

        if (urlPath === '/') urlPath = '/index.html';

        const filePath = path.join(this.staticDir, urlPath);

        if (!filePath.startsWith(this.staticDir)) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }

        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
            const indexPath = path.join(this.staticDir, 'index.html');
            if (fs.existsSync(indexPath)) {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                fs.createReadStream(indexPath).pipe(res);
            } else {
                res.writeHead(404);
                res.end('Not Found — Run "pnpm run build" in web/ directory first.');
            }
            return;
        }

        const ext = path.extname(filePath);
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
    }

    // ── WebSocket Connection Handler ──

    private handleConnection(ws: WebSocket) {
        logger.info('Web UI client connected via WebSocket');

        const history = new HistoryManager();
        let isGenerating = false;
        let shouldStop = false;
        let logWatcher: fs.FSWatcher | null = null;
        // Per-connection file store (uploads from this client session)
        const connFileStore = new Map<string, { path: string; name: string; mimeType: string }>();
        // Build per-connection Lunar Studio tools
        const lunarStudioTools = createLunarStudioTools(ws, connFileStore);

        // Initialize system prompt with memory
        const memoryContext = this.memoryManager.getContextString('owner');
        const systemPrompt = buildSystemPrompt(memoryContext);
        history.addSystemMessage(systemPrompt);

        // Send welcome + status
        this.send(ws, { type: 'welcome', message: 'Connected to Lunar Studio Agent' });
        this.sendStatus(ws);

        ws.on('message', async (data) => {
            let msg: ClientMessage;
            try {
                msg = JSON.parse(data.toString());
            } catch {
                this.send(ws, { type: 'error', message: 'Invalid JSON' });
                return;
            }

            switch (msg.type) {
                case 'get_status':
                    this.sendStatus(ws);
                    break;

                case 'stop':
                    shouldStop = true;
                    break;

                case 'get_logs':
                    this.sendLogs(ws);
                    // Start watching for new logs
                    if (!logWatcher) {
                        logWatcher = this.watchLogs(ws);
                    }
                    break;

                case 'get_memories':
                    this.sendMemories(ws);
                    break;

                case 'get_tools':
                    this.sendTools(ws);
                    break;

                case 'get_config':
                    this.sendConfig(ws);
                    break;

                case 'update_config':
                    if (msg.config) {
                        this.handleUpdateConfig(ws, msg.config);
                    }
                    break;

                case 'get_sessions': // Context Management
                    if (this.whatsapp) {
                        const sessions = Array.from(this.whatsapp.getHistoryManagers().keys());
                        this.send(ws, { type: 'sessions', sessions });
                    } else {
                        this.send(ws, { type: 'error', message: 'WhatsApp service not active' });
                    }
                    break;

                case 'get_history':
                    if (this.whatsapp && msg.chatId) {
                        const hist = this.whatsapp.getHistoryManagers().get(msg.chatId);
                        const tools = this.whatsapp.getAvailableTools(msg.chatId);
                        if (hist) {
                            this.send(ws, {
                                type: 'history',
                                chatId: msg.chatId,
                                messages: hist.getMessages(),
                                tools: tools.map(t => ({ name: t.name, description: t.description }))
                            });
                        } else {
                            this.send(ws, { type: 'error', message: 'History not found' });
                        }
                    }
                    break;

                case 'clear_history':
                    if (this.whatsapp && msg.chatId) {
                        const hist = this.whatsapp.getHistoryManagers().get(msg.chatId);
                        if (hist) {
                            hist.clear();
                            this.send(ws, { type: 'history_cleared', chatId: msg.chatId });
                            logger.info(`Context cleared for ${msg.chatId} via Web/CLI`);
                        }
                    }
                    break;

                case 'upload_file': {
                    // Client uploads a file (base64) → we save it and give it a fileId
                    if (!msg.fileName || !msg.data) {
                        this.send(ws, { type: 'error', message: 'upload_file requires fileName and data' });
                        break;
                    }
                    const mimeType = msg.mimeType || 'application/octet-stream';
                    const fileId = saveUploadedFile(msg.fileName, mimeType, msg.data);
                    // Also add to this connection's store so read_app_file can access it
                    connFileStore.set(fileId, uploadedFiles.get(fileId)!);
                    this.send(ws, {
                        type: 'upload_ok',
                        fileId,
                        fileName: msg.fileName,
                        mimeType,
                        message: `File uploaded (id: ${fileId}). Tell the AI: "I uploaded a file with id ${fileId}" to use it.`,
                    });
                    break;
                }

                case 'pop_history':
                    if (this.whatsapp && msg.chatId) {
                        const hist = this.whatsapp.getHistoryManagers().get(msg.chatId);
                        if (hist) {
                            hist.pop();
                            this.send(ws, { type: 'history_popped', chatId: msg.chatId });
                            logger.info(`Last message popped for ${msg.chatId} via Web/CLI`);
                        }
                    }
                    break;

                case 'chat':
                    if (!msg.message || !msg.message.trim()) {
                        this.send(ws, { type: 'error', message: 'Empty message' });
                        return;
                    }
                    if (isGenerating) {
                        this.send(ws, { type: 'error', message: 'Already generating' });
                        return;
                    }
                    isGenerating = true;
                    shouldStop = false;

                    try {
                        await this.handleChat(ws, history, msg.message.trim(), () => shouldStop, lunarStudioTools);
                    } catch (err: any) {
                        logger.error(`Chat error: ${err.message}`);
                        this.send(ws, { type: 'error', message: err.message });
                    }

                    isGenerating = false;
                    this.send(ws, { type: 'done' });
                    break;
            }
        });

        ws.on('close', () => {
            logger.info('Web UI client disconnected');
            shouldStop = true;
            if (logWatcher) {
                logWatcher.close();
                logWatcher = null;
            }
        });

        ws.on('error', (err) => {
            logger.error(`WebSocket error: ${err.message}`);
        });
    }

    // ── Logs Handler ──

    private sendLogs(ws: WebSocket) {
        const logPath = getLogPath();
        try {
            if (!fs.existsSync(logPath)) {
                this.send(ws, { type: 'logs', lines: [] });
                return;
            }
            const content = fs.readFileSync(logPath, 'utf-8');
            const lines = content.trim().split('\n').slice(-200); // Last 200 lines
            const parsed = lines.map(line => {
                try {
                    return JSON.parse(line);
                } catch {
                    return { level: 'info', message: line, timestamp: '' };
                }
            });
            this.send(ws, { type: 'logs', lines: parsed });
        } catch (err: any) {
            this.send(ws, { type: 'error', message: `Failed to read logs: ${err.message}` });
        }
    }

    private watchLogs(ws: WebSocket): fs.FSWatcher {
        const logPath = getLogPath();
        let lastSize = fs.existsSync(logPath) ? fs.statSync(logPath).size : 0;

        return fs.watch(logPath, () => {
            try {
                const stats = fs.statSync(logPath);
                if (stats.size > lastSize) {
                    const fd = fs.openSync(logPath, 'r');
                    const buffer = Buffer.alloc(stats.size - lastSize);
                    fs.readSync(fd, buffer, 0, buffer.length, lastSize);
                    fs.closeSync(fd);

                    const newData = buffer.toString('utf-8').trim();
                    if (newData) {
                        for (const line of newData.split('\n')) {
                            try {
                                const parsed = JSON.parse(line);
                                this.send(ws, { type: 'log_line', line: parsed });
                            } catch {
                                this.send(ws, { type: 'log_line', line: { level: 'info', message: line, timestamp: '' } });
                            }
                        }
                    }
                    lastSize = stats.size;
                }
            } catch {
                // ignore
            }
        });
    }

    // ── Memories Handler ──

    private sendMemories(ws: WebSocket) {
        const memories = this.memoryManager.getAllMemories();
        this.send(ws, { type: 'memories', memories });
    }

    // ── Tools Handler ──

    private sendTools(ws: WebSocket) {
        const toolList = tools.map((t: Tool) => {
            let schema: any = {};
            try {
                schema = zodToJsonSchema(t.schema);
            } catch {
                // pass
            }
            return {
                name: t.name,
                description: t.description,
                schema,
            };
        });
        this.send(ws, { type: 'tools_list', tools: toolList });
    }

    // ── Config Handlers ──

    private sendConfig(ws: WebSocket) {
        const providers = ['openai', 'google', 'antigravity', 'groq'] as const;
        const currentProvider = config.getProvider() || '';
        const workspace = config.getWorkspace();
        const waConfig = config.getWhatsAppConfig();
        const people = config.getPeople();

        const apiKeys: Record<string, boolean> = {};
        const models: Record<string, string> = {};

        for (const p of providers) {
            apiKeys[p] = !!config.getApiKey(p);
            models[p] = config.getDefaultModel(p) || '';
        }

        this.send(ws, {
            type: 'config',
            provider: currentProvider,
            apiKeys,
            models,
            workspace,
            whatsapp: waConfig || { enabled: false },
            people: people || [],
        });
    }

    private handleUpdateConfig(ws: WebSocket, update: { key: string; value: any }) {
        try {
            switch (update.key) {
                case 'provider':
                    config.setProvider(update.value);
                    break;
                case 'workspace':
                    config.setWorkspace(update.value);
                    break;
                case 'apiKey': {
                    const { provider, key } = update.value;
                    config.setApiKey(provider, key);
                    break;
                }
                case 'model': {
                    const { provider, model } = update.value;
                    config.setDefaultModel(provider, model);
                    break;
                }
                case 'whatsapp':
                    config.setWhatsAppConfig(
                        update.value.enabled,
                        update.value.allowedNumbers
                    );
                    break;
                default:
                    this.send(ws, { type: 'error', message: `Unknown config key: ${update.key}` });
                    return;
            }
            logger.info(`Config updated: ${update.key}`);
            this.send(ws, { type: 'config_updated', key: update.key, success: true });
            // Send refreshed config
            this.sendConfig(ws);
            // Also refresh status since provider/model may have changed
            this.sendStatus(ws);
        } catch (err: any) {
            this.send(ws, { type: 'error', message: `Config update failed: ${err.message}` });
        }
    }

    // ── Chat Handler (Agentic Loop) ──

    private async handleChat(
        ws: WebSocket,
        history: HistoryManager,
        userMessage: string,
        isStopped: () => boolean,
        lunarStudioTools: Tool[] = []
    ) {
        const providerName = config.getProvider() || 'google';
        const apiKey = config.getApiKey(providerName);
        const model = config.getDefaultModel(providerName);

        if (!apiKey) {
            this.send(ws, { type: 'error', message: 'No API key configured. Run "lunarstudio setup" first.' });
            return;
        }

        const llm: LLMProvider = createLLM(providerName, apiKey, model || 'default');

        const memoryContext = this.memoryManager.getContextString('owner', userMessage);
        if (memoryContext) {
            history.addSystemMessage(buildSystemPrompt(memoryContext));
        }

        history.addUserMessage(userMessage);

        let keepGenerating = true;
        while (keepGenerating && !isStopped()) {
            keepGenerating = false;

            const response = await llm.generate(history.getMessages(), [...tools, ...lunarStudioTools]);
            let content = response.content || '';
            content = this.memoryManager.parseAndSaveMemories(content, 'owner');

            if (content) {
                this.send(ws, { type: 'text', content });
            }

            history.addMessage(response.role, content, response.tool_calls);

            if (response.tool_calls && response.tool_calls.length > 0 && !isStopped()) {
                for (const call of response.tool_calls) {
                    if (isStopped()) break;

                    const toolName = call.function.name;
                    let args: Record<string, any> = {};
                    try {
                        args = JSON.parse(call.function.arguments);
                    } catch {
                        // pass
                    }

                    this.send(ws, {
                        type: 'tool_start',
                        name: toolName,
                        args: JSON.stringify(args),
                    });

                    const tool = getTool(toolName) || lunarStudioTools.find((t: Tool) => t.name === toolName);
                    let result = 'Tool not found.';

                    if (tool) {
                        try {
                            const executionResult = await tool.execute(args);
                            result = typeof executionResult === 'string'
                                ? executionResult
                                : JSON.stringify(executionResult);
                        } catch (err: any) {
                            result = `Error executing tool: ${err.message}`;
                            logger.error(result);
                        }
                    }

                    this.send(ws, {
                        type: 'tool_result',
                        name: toolName,
                        result,
                    });

                    history.addToolResult(call.id || 'unknown', toolName, result);
                }

                keepGenerating = true;
            }
        }
    }

    // ── Helpers ──

    private send(ws: WebSocket, msg: ServerMessage) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(msg));
        }
    }

    private sendStatus(ws: WebSocket) {
        const providerName = config.getProvider() || 'google';
        const model = config.getDefaultModel(providerName) || 'default';
        const waConfig = config.getWhatsAppConfig();
        const toolNames = tools.map(t => t.name);

        this.send(ws, {
            type: 'status',
            agent: 'online',
            provider: providerName,
            model,
            tools: toolNames,
            whatsapp: waConfig?.enabled ? 'connected' : 'disabled',
        });
    }

    // ── Start ──

    async start(): Promise<void> {
        return new Promise((resolve) => {
            this.server.listen(this.port, () => {
                logger.info(`Web UI server running at http://localhost:${this.port}`);
                console.log(`\n  🌙 Lunar Studio Web UI: http://localhost:${this.port}\n`);
                resolve();
            });
        });
    }

    stop() {
        this.wss.close();
        this.server.close();
    }
}
