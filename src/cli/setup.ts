import inquirer from 'inquirer';
import chalk from 'chalk';
import * as config from './config.js';

interface SetupAnswers {
    provider: config.Provider;
    apiKey: string;
    model: string;
}

import { createLLM } from '../../llm/factory.js';

export async function setupCommand() {
    console.log(chalk.bold.blue('Welcome to LLM Engine Setup'));

    // Step 1: Select Provider
    const { provider } = await inquirer.prompt([
        {
            type: 'list',
            name: 'provider',
            message: 'Select your default LLM provider:',
            choices: ['openai', 'google', 'groq', 'antigravity'],
            default: config.getProvider() || 'google',
        }
    ]);

    // Step 2: Configure selected provider
    console.log(chalk.blue(`Configuring ${provider}...`));

    const { apiKey } = await inquirer.prompt([
        {
            type: 'password',
            name: 'apiKey',
            message: `Enter your ${provider} API Key:`,
            default: config.getApiKey(provider),
            validate: (input: string) => input.trim().length > 0 || 'API Key is required.',
        }
    ]);

    // Step 3: Fetch Models (Dynamic)
    let model = config.getDefaultModel(provider);
    let models: string[] = [];

    // Default fallback models
    const defaultModels: Record<string, string> = {
        openai: 'gpt-4o',
        google: 'gemini-1.5-flash',
        groq: 'llama3-70b-8192',
        antigravity: 'ag-model-1'
    };

    console.log(chalk.yellow(`Attempting to fetch available models for ${provider}...`));
    try {
        const llm = createLLM(provider, apiKey);
        if (llm.listModels) {
            models = await llm.listModels();
        }
    } catch (e: any) {
        console.error(chalk.red(`Failed to fetch models: ${e.message}`));
        console.log(chalk.dim('Falling back to manual model entry.'));
    }

    if (models.length > 0) {
        const { selectedModel } = await inquirer.prompt([
            {
                type: 'list',
                name: 'selectedModel',
                message: `Select default model for ${provider}:`,
                choices: models,
                default: model && models.includes(model) ? model : defaultModels[provider] || models[0],
            }
        ]);
        model = selectedModel;
    } else {
        const { manualModel } = await inquirer.prompt([
            {
                type: 'input',
                name: 'manualModel',
                message: `Enter default model for ${provider}:`,
                default: model || defaultModels[provider],
            }
        ]);
        model = manualModel;
    }

    // Step 4: Save configuration
    config.setProvider(provider);
    config.setApiKey(provider, apiKey);
    if (model) {
        config.setDefaultModel(provider, model);
    }

    console.log(chalk.green('✔ Configuration saved successfully!'));
    console.log(chalk.dim(`Provider: ${provider}`));
    console.log(chalk.dim(`Model: ${model}`));

    // Step 4: WhatsApp Setup
    const waConfig = config.getWhatsAppConfig();
    const isWaSetup = waConfig && waConfig.enabled;

    const { setupWhatsApp } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'setupWhatsApp',
            message: isWaSetup
                ? 'WhatsApp is already configured. Do you want to re-configure it? (Existing config will be overwritten)'
                : 'Do you want to setup WhatsApp integration now? (Requires scanning QR code)',
            default: false,
        }
    ]);

    if (!setupWhatsApp && isWaSetup) {
        console.log(chalk.dim('Keeping existing WhatsApp configuration.'));
    }

    if (setupWhatsApp) {
        console.log(chalk.blue('Starting WhatsApp Setup...'));
        const { allowedNumbersInput } = await inquirer.prompt([
            {
                type: 'input',
                name: 'allowedNumbersInput',
                message: 'Enter allowed phone numbers (comma separated, e.g., 1234567890@c.us, 9876543210@c.us). Leave empty to allow ALL (Not recommended):',
                default: isWaSetup && waConfig?.allowedNumbers ? waConfig.allowedNumbers.join(',') : undefined,
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
