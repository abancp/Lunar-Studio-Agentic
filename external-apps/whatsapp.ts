import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { logger } from '../src/log.js';
import * as config from '../src/cli/config.js';
import { createLLM } from '../llm/factory.js';
import { HistoryManager } from '../src/cli/history.js';
import { AGENTIC_SYSTEM_PROMPT, buildSystemPrompt } from '../llm/system.js';
import { tools as baseTools } from '../tools/index.js';
import { Tool } from '../llm/types.js';
import { MemoryManager } from '../src/memory.js';

type WAMessage = any;

const AI_START_COMMAND = "@ai_start"
const AI_STOP_COMMAND = "@ai_stop"
const TO_AI_COMMAND = "@ai"

/**
 * Create a send_file tool bound to a specific WhatsApp message context.
 */
function createSendFileTool(client: any, msg: WAMessage): Tool {
    return {
        name: 'send_file',
        description: 'Send a file to the user via WhatsApp. Use this when the user asks for a file or when a tool produces a file that should be shared.',
        schema: z.object({
            filePath: z.string().describe('Absolute path to the file to send'),
            caption: z.string().optional().describe('Optional caption for the file'),
        }),
        execute: async ({ filePath, caption }: { filePath: string; caption?: string }) => {
            try {
                const absPath = path.resolve(filePath);
                if (!fs.existsSync(absPath)) {
                    return `Error: File not found at ${absPath}`;
                }

                const fileName = path.basename(absPath);
                const ext = path.extname(absPath).toLowerCase();
                const isMedia = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mov', '.avi', '.mkv', '.3gp'].includes(ext);

                const media = MessageMedia.fromFilePath(absPath);
                media.filename = fileName;
                const chat = await msg.getChat();
                await chat.sendMessage(media, {
                    caption: caption || (isMedia ? undefined : fileName),
                    sendMediaAsDocument: !isMedia,
                });
                logger.info(`Sent ${isMedia ? 'media' : 'file'} to ${msg.from}: ${absPath}`);
                return `File sent successfully: ${path.basename(absPath)}`;
            } catch (error: any) {
                logger.error(`Failed to send file ${filePath}: ${error.message}`);
                return `Error sending file: ${error.message}`;
            }
        },
    };
}

export class WhatsAppService {
    private client: any;
    private enabled: boolean = false;
    private allowedNumbers: Set<string> = new Set();
    private historyManagers: Map<string, HistoryManager> = new Map();
    private startTime: number;
    private hotword?: string;
    private aiEnabledNumbers: Record<string, boolean> = {};
    private memoryManager: MemoryManager;

    constructor() {
        this.startTime = Math.floor(Date.now() / 1000);
        this.memoryManager = new MemoryManager();
        const conf = config.getWhatsAppConfig();
        this.enabled = conf?.enabled || false;
        this.hotword = conf?.hotword;

        if (conf?.allowedNumbers) {
            conf.allowedNumbers.forEach(n => this.allowedNumbers.add(n));
        }

        this.client = new Client({
            authStrategy: new LocalAuth({ clientId: 'lunar-studio-agent' }),
            puppeteer: {
                executablePath: '/usr/bin/google-chrome-stable',
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            }
        });

        this.registerEvents();
    }

    private registerEvents() {
        this.client.on('qr', (qr: string) => {
            logger.info('QR Code received. Scan it to login.');
            console.log('\nScan this QR code with WhatsApp:\n');
            qrcode.generate(qr, { small: true });
        });

        this.client.on('ready', () => {
            logger.info('WhatsApp Client is ready!');
            console.log('WhatsApp connected.');
        });

        this.client.on('authenticated', () => {
            logger.info('WhatsApp authenticated.');
        });

        this.client.on('auth_failure', (msg: string) => {
            logger.error(`WhatsApp auth failure: ${msg}`);
        });

        this.client.on('message_create', async (msg: WAMessage) => {
            if (msg.fromMe) return;
            await this.handleMessage(msg);
        });
    }

    async initialize() {
        if (!this.enabled) {
            logger.info("WhatsApp service disabled in config. Skipping.");
            return;
        }
        logger.info("Initializing WhatsApp Client...");
        try {
            await this.client.initialize();
        } catch (error: any) {
            logger.error(`Failed to initialize WhatsApp client: ${error.message}`);
        }
    }

    async setup() {
        logger.info("Starting WhatsApp Setup (QR generation)...");
        this.enabled = true;
        await this.client.initialize();
    }

    private async handleMessage(msg: WAMessage) {
        // Filter out old messages
        let messageTs = msg.timestamp;
        if (typeof messageTs === 'number') {
            if (messageTs > 100000000000) {
                messageTs = Math.floor(messageTs / 1000);
            }
            if (messageTs < this.startTime) {
                logger.warn(`Ignoring old message from ${msg.from} (ts: ${messageTs}, start: ${this.startTime})`);
                return;
            }
        } else {
            logger.warn(`Message from ${msg.from} has no valid timestamp (${msg.timestamp}). Processing anyway.`);
        }

        const chatId = msg.from as string;

        if (this.allowedNumbers.size > 0 && !this.allowedNumbers.has(chatId)) {
            logger.warn(`Blocked message from unauthorized number: ${chatId}`);
            return;
        }

        if (msg.body.startsWith(AI_START_COMMAND)) {
            this.aiEnabledNumbers[chatId] = true;
            logger.info(`Ai chat started with ${chatId}`);
            return;
        }

        if (msg.body.startsWith(AI_STOP_COMMAND)) {
            this.aiEnabledNumbers[chatId] = false;
            logger.info(`Ai chat stopped with ${chatId}`);
            return;
        }

        if (!msg.body.startsWith(TO_AI_COMMAND) && !this.aiEnabledNumbers[chatId]) {
            logger.info(`Message from ${chatId} does not start with hotword or ai chat not started. Ignoring.`);
            return;
        }

        logger.info(`Received WhatsApp message from ${chatId}: ${msg.body}`);

        // Resolve person ID — only configured people get memories
        const personId = this.memoryManager.resolvePersonId(chatId);
        const hasMemory = personId !== null;

        if (hasMemory) {
            const people = config.getPeople();
            const person = people.find((p) => p.id === personId);
            logger.info(`Recognized person: ${person?.name || personId} (${person?.relation || 'unknown'}) from ${chatId}`);
        } else {
            logger.info(`Unknown contact: ${chatId} — no memory management`);
        }

        // Build system prompt — always refresh with latest memories each message
        let systemPrompt: string;
        if (hasMemory) {
            const memoryContext = this.memoryManager.getContextString(personId!, msg.body);
            systemPrompt = buildSystemPrompt(memoryContext);
        } else {
            systemPrompt = AGENTIC_SYSTEM_PROMPT;
        }

        // Get or Create History for this chat
        let history = this.historyManagers.get(chatId);
        if (!history) {
            history = new HistoryManager(systemPrompt);
            this.historyManagers.set(chatId, history);
        } else {
            // Always update system prompt with fresh memory context
            history.addSystemMessage(systemPrompt);
        }

        history.addUserMessage(msg.body);

        const providerName = config.getProvider() || 'google';
        const apiKey = config.getApiKey(providerName);
        const model = config.getDefaultModel(providerName);

        if (!apiKey) {
            logger.error("No API Key found for LLM. Cannot reply.");
            await msg.reply("Error: I am not configured properly (missing API Key).");
            return;
        }

        try {
            const llm = createLLM(providerName, apiKey, model || 'default');

            // Inject WhatsApp-specific tools (send_file bound to this message)
            const waTools: Tool[] = [
                ...baseTools,
                createSendFileTool(this.client, msg),
            ];

            let keepGenerating = true;
            let finalResponseContent = "";

            while (keepGenerating) {
                keepGenerating = false;
                const response = await llm.generate(history.getMessages(), waTools);

                let content = response.content || '';

                // Parse inline memories only for configured people
                if (hasMemory) {
                    content = this.memoryManager.parseAndSaveMemories(content, personId!);
                }

                history.addMessage(response.role, content, response.tool_calls);

                if (content) {
                    finalResponseContent = content;
                }

                if (content.includes("<NO_RESPONSE>")) {
                    logger.info("Ignoring useless prompt: " + msg.body);
                    return;
                }

                if (response.tool_calls && response.tool_calls.length > 0) {
                    logger.info(`Tool calls detected for ${chatId}: ${response.tool_calls.length}`);

                    for (const call of response.tool_calls) {
                        const tool = waTools.find(t => t.name === call.function.name);
                        let resultString = "";
                        if (tool) {
                            try {
                                const args = JSON.parse(call.function.arguments);
                                logger.info(`Executing tool ${tool.name} with args: ${JSON.stringify(args)}`);
                                const result = await tool.execute(args);
                                resultString = typeof result === 'string' ? result : JSON.stringify(result);
                            } catch (error: any) {
                                logger.error(`Tool execution error: ${error.message}`);
                                resultString = `Error executing tool: ${error.message}`;
                            }
                        } else {
                            resultString = `Error: Tool ${call.function.name} not found.`;
                        }
                        history.addToolResult(call.id || 'unknown', tool?.name || 'unknown', resultString);
                    }
                    keepGenerating = true;
                }
            }

            if (finalResponseContent) {
                await msg.reply(finalResponseContent);
                logger.info(`Replied to ${chatId}`);
            }

        } catch (error: any) {
            logger.error(`LLM Error processing message: ${error.message}`);
            await msg.reply("I encountered an error processing your request.");
        }
    }
}
