import { logger } from './log.js';
import { WhatsAppService } from '../external-apps/whatsapp.js';
import * as config from './cli/config.js';

export async function startDaemon() {
    logger.info('Starting Lunar Studio Agent Daemon...');

    // 1. Load Config
    const provider = config.getProvider();
    if (!provider) {
        logger.error('No LLM Provider configured. Run "npm run setup" first.');
        process.exit(1);
    }
    logger.info(`LLM Provider: ${provider}`);

    // 2. Start WhatsApp Service
    const waConfig = config.getWhatsAppConfig();
    if (waConfig && waConfig.enabled) {
        const whatsapp = new WhatsAppService();
        await whatsapp.initialize();
    } else {
        logger.info('WhatsApp service is disabled or not configured.');
    }

    // 3. Keep alive (handled by WhatsApp client usually, or just empty interval)
    // If no services are running, exit?
    if (!waConfig?.enabled) {
        logger.warn('No active services enabled. Exiting.');
    } else {
        logger.info('Daemon is running. Press Ctrl+C to stop.');
        // Prevent exit
        setInterval(() => { }, 1000 * 60 * 60);
    }
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
