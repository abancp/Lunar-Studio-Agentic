import { logger } from './log.js';
import { WhatsAppService } from '../external-apps/whatsapp.js';
import { WebServer } from './server.js';
import * as config from './cli/config.js';
import { scheduler } from './cronjobs.js';
import { getTool } from '../tools/index.js';

export async function startDaemon() {
    logger.info('Starting Lunar Studio Agent Daemon...');

    // 1. Load Config
    const provider = config.getProvider();
    if (!provider) {
        logger.error('No LLM Provider configured. Run "lunarstudio setup" first.');
        process.exit(1);
    }
    logger.info(`LLM Provider: ${provider}`);

    // 2. Initialize Scheduler
    scheduler.initialize(getTool);

    // 3. Initialize WhatsApp Service (if enabled)
    const waConfig = config.getWhatsAppConfig();
    let whatsapp: WhatsAppService | undefined;

    if (waConfig && waConfig.enabled) {
        whatsapp = new WhatsAppService();
    }

    // 4. Start Web UI Server (always runs)
    const webServer = new WebServer(3210, whatsapp);
    await webServer.start();

    // 5. Start WhatsApp (after server is up)
    if (whatsapp) {
        // Don't await strictly if we want non-blocking start, or await to keep process alive/clean logs
        // But since we want the server to be responsive while QR is scanning, we shouldn't await it *before* server start.
        // We can await it here as the last step.
        whatsapp.initialize().catch(err => {
            logger.error(`WhatsApp initialization failed: ${err.message}`);
        });
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
