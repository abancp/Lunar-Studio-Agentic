import { logger } from './log.js';
import { WhatsAppService } from '../external-apps/whatsapp.js';
import { WebServer } from './server.js';
import * as config from './cli/config.js';

export async function startDaemon() {
    logger.info('Starting Lunar Studio Agent Daemon...');

    // 1. Load Config
    const provider = config.getProvider();
    if (!provider) {
        logger.error('No LLM Provider configured. Run "lunarstudio setup" first.');
        process.exit(1);
    }
    logger.info(`LLM Provider: ${provider}`);

    // 2. Start Web UI Server (always runs)
    const webServer = new WebServer(3210);
    await webServer.start();

    // 3. Start WhatsApp Service
    const waConfig = config.getWhatsAppConfig();
    if (waConfig && waConfig.enabled) {
        const whatsapp = new WhatsAppService();
        await whatsapp.initialize();
    } else {
        logger.info('WhatsApp service is disabled or not configured.');
    }

    logger.info('Daemon is running. Press Ctrl+C to stop.');
}

// Handle signals
process.on('SIGINT', () => {
    logger.info('Stopping daemon...');
    process.exit(0);
});

// Check if running directly
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    startDaemon().catch(error => {
        logger.error(`Fatal error: ${error.message}`);
        process.exit(1);
    });
}
