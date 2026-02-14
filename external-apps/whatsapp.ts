import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from 'qrcode-terminal';
import { logger } from '../src/log.js';
import * as config from '../src/cli/config.js';
import { createLLM } from '../llm/factory.js';
import { HistoryManager } from '../src/cli/history.js';
import { AGENTIC_SYSTEM_PROMPT } from '../llm/system.js';
import { tools } from '../tools/index.js';

export class WhatsAppService {
    private client: Client;
    private enabled: boolean = false;
    private allowedNumbers: Set<string> = new Set();
    private historyManagers: Map<string, HistoryManager> = new Map(); // Chat ID -> HistoryManager

    constructor() {
        const conf = config.getWhatsAppConfig();
        this.enabled = conf?.enabled || false;

        if (conf?.allowedNumbers) {
            conf.allowedNumbers.forEach(n => this.allowedNumbers.add(n));
        }

        // Initialize Client with LocalAuth to save session
        this.client = new Client({
            authStrategy: new LocalAuth({ clientId: 'lunar-studio-agent' }),
            puppeteer: {
                executablePath: '/usr/bin/google-chrome-stable',
                args: ['--no-sandbox', '--disable-setuid-sandbox'], // Required for some environments (like standard CI/Linux)
            }
        });

        this.registerEvents();
    }

    private registerEvents() {
        this.client.on('qr', (qr) => {
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

        this.client.on('auth_failure', (msg) => {
            logger.error(`WhatsApp auth failure: ${msg}`);
        });

        this.client.on('message_create', async (msg) => {
            // message_create fires for all messages (including own). 
            // We usually want 'message' event for received, but 'message_create' allows testing with self if needed.
            // But strict bot logic should use 'message'. 
            // However, we want to reply to users.
            if (msg.fromMe) return; // Ignore own messages
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
        // Force enable in config
        logger.info("Starting WhatsApp Setup (QR generation)...");
        this.enabled = true;
        await this.client.initialize();
        // Wait for QR or Ready... handled by events.
    }

    private async handleMessage(msg: WAMessage) {
        const chatId = msg.from; // e.g., '12345@c.us'

        // Access Control
        // If allowedNumbers is empty, we might default to allow none, or allow all? 
        // Safer to allow none or warn. 
        // For now, let's assume if the user set it up, they can whitelist numbers or we just log and ignore.
        // If allowedNumbers has entries, check it.
        if (this.allowedNumbers.size > 0 && !this.allowedNumbers.has(chatId)) {
            logger.warn(`Blocked message from unauthorized number: ${chatId}`);
            return;
        }

        logger.info(`Received WhatsApp message from ${chatId}: ${msg.body}`);

        // Get or Create History for this chat
        let history = this.historyManagers.get(chatId);
        if (!history) {
            history = new HistoryManager(AGENTIC_SYSTEM_PROMPT);
            // Optionally load previous context if we had persistence
            this.historyManagers.set(chatId, history);
        }

        // Add User Message
        history.addUserMessage(msg.body);

        // Process with LLM
        // We need a provider. Use configured default.
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

            // Loop for tools
            let keepGenerating = true;
            let finalResponseContent = "";

            while (keepGenerating) {
                keepGenerating = false;
                const response = await llm.generate(history.getMessages(), tools);

                history.addMessage(response.role, response.content, response.tool_calls);

                if (response.content) {
                    finalResponseContent = response.content;
                }

                if (response.tool_calls && response.tool_calls.length > 0) {
                    logger.info(`Tool calls detected for ${chatId}: ${response.tool_calls.length}`);

                    // Execute tools
                    for (const call of response.tool_calls) {
                        const tool = tools.find(t => t.name === call.function.name);
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
                    keepGenerating = true; // Loop back to LLM with tool results
                }
            }

            // Send Final Reply
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
