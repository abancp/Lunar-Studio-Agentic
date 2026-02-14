import inquirer from 'inquirer';
import chalk from 'chalk';
import * as config from './config.js';

interface SetupAnswers {
    provider: config.Provider;
    apiKey: string;
    model: string;
}

export async function setupCommand() {
    console.log(chalk.bold.blue('Welcome to LLM Engine Setup'));

    // Step 1: Select Provider
    const { provider } = await inquirer.prompt([
        {
            type: 'list',
            name: 'provider',
            message: 'Select your default LLM provider:',
            choices: ['openai', 'google', 'antigravity'],
            default: config.getProvider() || 'google',
        }
    ]);

    // Step 2: Configure selected provider
    console.log(chalk.blue(`Configuring ${provider}...`));

    const providerConfig = await inquirer.prompt([
        {
            type: 'password',
            name: 'apiKey',
            message: `Enter your ${provider} API Key:`,
            default: config.getApiKey(provider),
            validate: (input: string) => input.trim().length > 0 || 'API Key is required.',
        },
        {
            type: 'input',
            name: 'model',
            message: `Enter default model for ${provider} (optional):`,
            default: config.getDefaultModel(provider) || (provider === 'openai' ? 'gpt-4o' : provider === 'google' ? 'gemini-1.5-flash' : 'ag-model-1'),
        }
    ]);

    // Step 3: Save configuration
    config.setProvider(provider);
    config.setApiKey(provider, providerConfig.apiKey);
    config.setDefaultModel(provider, providerConfig.model);

    console.log(chalk.green('✔ Configuration saved successfully!'));
    console.log(chalk.dim(`Provider: ${provider}`));
    console.log(chalk.dim(`Model: ${providerConfig.model}`));

    // Step 4: WhatsApp Setup
    const { setupWhatsApp } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'setupWhatsApp',
            message: 'Do you want to setup WhatsApp integration now? (Requires scanning QR code)',
            default: false,
        }
    ]);

    if (setupWhatsApp) {
        console.log(chalk.blue('Starting WhatsApp Setup...'));
        const { allowedNumbersInput } = await inquirer.prompt([
            {
                type: 'input',
                name: 'allowedNumbersInput',
                message: 'Enter allowed phone numbers (comma separated, e.g., 1234567890@c.us, 9876543210@c.us). Leave empty to allow ALL (Not recommended):',
            }
        ]);

        const nums = allowedNumbersInput ? allowedNumbersInput.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0) : undefined;
        config.setWhatsAppConfig(true, nums);

        // We can't easily import WhatsAppService here if it causes side effects or build issues, but let's try dynamic import or just import class.
        // To avoid circular dep issues or heavyweight imports if not needed, dynamic import is good.
        try {
            // Dynamic import to avoid loading puppeteer unless needed?
            const { WhatsAppService } = await import('../../external-apps/whatsapp.js');
            const wa = new WhatsAppService();
            await wa.setup();
            // Note: wa.setup() initiates client. It will wait for QR scan event which prints to console.
            // But we need to keep process alive or wait? 
            // Usually setup is just config. Real connection happens in daemon.
            // But user wants to scan QR now. 
            // The WhatsAppService.setup() calls initialize() which prints QR. 
            // After scan, 'ready' event fires. We should strictly wait for 'ready' here if we want to confirm success.
            console.log(chalk.yellow('Please scan the QR code above completely.'));
            console.log(chalk.dim('After scanning, you can stop this process (Ctrl+C) and run the daemon.'));
            // We won't block forever here in setup, just give them time to see QR.
            // Or better, let them run `daemon` to actually connect. 
            // Let's just save config and tell them to run daemon.

            // actually, better flow:
            // 1. Save config.
            // 2. Tell user "Run `npm run start` (or whatever) to start the agent and scan QR code on first run."
            console.log(chalk.green('WhatsApp configured! Run the application to scan QR code and start the agent.'));
        } catch (e: any) {
            console.error(chalk.red(`Error setting up WhatsApp: ${e.message}`));
        }
    }
}
