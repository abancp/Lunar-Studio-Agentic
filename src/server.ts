import http from 'http';
import fs from 'fs';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { logger } from './log.js';
import * as config from './cli/config.js';
import { createLLM } from '../llm/factory.js';
import { tools, getTool } from '../tools/index.js';
import { HistoryManager } from './cli/history.js';
import { buildSystemPrompt } from '../llm/system.js';
import { MemoryManager } from './memory.js';
import type { LLMProvider } from '../llm/types.js';

// ── WebSocket Message Types ──

interface ClientMessage {
    type: 'chat' | 'stop' | 'get_status';
    message?: string;
}

interface ServerMessage {
    type: 'text' | 'tool_start' | 'tool_result' | 'done' | 'error' | 'status' | 'welcome';
    [key: string]: any;
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

    constructor(port: number = 3210) {
        this.port = port;
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

        // Strip query string
        urlPath = urlPath.split('?')[0]!;

        // Default to index.html
        if (urlPath === '/') urlPath = '/index.html';

        const filePath = path.join(this.staticDir, urlPath);

        // Security: prevent path traversal
        if (!filePath.startsWith(this.staticDir)) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }

        // Check if file exists
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
            // SPA fallback: serve index.html for any non-file route
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
                        await this.handleChat(ws, history, msg.message.trim(), () => shouldStop);
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
        });

        ws.on('error', (err) => {
            logger.error(`WebSocket error: ${err.message}`);
        });
    }

    // ── Chat Handler (Agentic Loop) ──

    private async handleChat(
        ws: WebSocket,
        history: HistoryManager,
        userMessage: string,
        isStopped: () => boolean
    ) {
        const providerName = config.getProvider() || 'google';
        const apiKey = config.getApiKey(providerName);
        const model = config.getDefaultModel(providerName);

        if (!apiKey) {
            this.send(ws, { type: 'error', message: 'No API key configured. Run "lunarstudio setup" first.' });
            return;
        }

        const llm: LLMProvider = createLLM(providerName, apiKey, model || 'default');

        // Refresh memory context
        const memoryContext = this.memoryManager.getContextString('owner', userMessage);
        if (memoryContext) {
            history.addSystemMessage(buildSystemPrompt(memoryContext));
        }

        history.addUserMessage(userMessage);

        let keepGenerating = true;
        while (keepGenerating && !isStopped()) {
            keepGenerating = false;

            const response = await llm.generate(history.getMessages(), tools);

            let content = response.content || '';

            // Parse and save memories
            content = this.memoryManager.parseAndSaveMemories(content, 'owner');

            // Send text to client
            if (content) {
                this.send(ws, { type: 'text', content });
            }

            // Store in history
            history.addMessage(response.role, content, response.tool_calls);

            // Handle tool calls
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

                    // Notify client: tool started
                    this.send(ws, {
                        type: 'tool_start',
                        name: toolName,
                        args: JSON.stringify(args),
                    });

                    const tool = getTool(toolName);
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

                    // Notify client: tool result
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
