import chalk from 'chalk';
import * as config from './config.js';
import { select, input, password, confirm } from '@inquirer/prompts';
import { createLLM } from '../../llm/factory.js';

export async function setupCommand() {
    console.log(chalk.bold.blue('\nLLM Engine Setup\n'));

    // -----------------------------
    // Step 1: Select Provider
    // -----------------------------
    const provider = await select({
        message: 'Select your default LLM provider:',
        choices: [
            { name: 'OpenAI', value: 'openai' },
            { name: 'Google (Gemini)', value: 'google' },
            { name: 'Groq', value: 'groq' },
            { name: 'Antigravity', value: 'antigravity' },
        ],
        default: config.getProvider() || 'google',
    }) as config.Provider;

    console.log(chalk.blue(`\nConfiguring ${provider}...\n`));

    // -----------------------------
    // Step 2: API Key
    // -----------------------------
    const apiKey = await password({
        message: `Enter your ${provider} API Key:`,
        validate: (input) =>
            input.trim().length > 0 ? true : 'API Key is required.',
    });

    // -----------------------------
    // Step 3: Fetch Models
    // -----------------------------
    let model = config.getDefaultModel(provider);
    let models: string[] = [];

    const defaultModels: Record<string, string> = {
        openai: 'gpt-4o',
        google: 'gemini-1.5-flash',
        groq: 'llama3-70b-8192',
        antigravity: 'ag-model-1',
    };

    console.log(
        chalk.yellow(`\nFetching available models for ${provider}...\n`)
    );

    try {
        const llm = createLLM(provider, apiKey);
        if (llm.listModels) {
            models = await llm.listModels();
        }
    } catch (e: any) {
        console.error(chalk.red(`Failed to fetch models: ${e.message}`));
        console.log(chalk.dim('Falling back to manual model entry.\n'));
    }

    if (models.length > 0) {
        model = await select({
            message: `Select default model for ${provider}:`,
            choices: models.map((m) => ({ name: m, value: m })),
            default:
                model && models.includes(model)
                    ? model
                    : defaultModels[provider] || models[0],
            pageSize: 15,
        });
    } else {
        model = await input({
            message: `Enter default model for ${provider}:`,
            default: model || defaultModels[provider],
        });
    }

    // -----------------------------
    // Step 4: Save Configuration
    // -----------------------------
    config.setProvider(provider);
    config.setApiKey(provider, apiKey);
    config.setDefaultModel(provider, model);

    console.log(chalk.green('\n✔ Configuration saved successfully!\n'));
    console.log(chalk.dim(`Provider: ${provider}`));
    console.log(chalk.dim(`Model: ${model}\n`));

    // -----------------------------
    // Step 5: WhatsApp Setup
    // -----------------------------
    const waConfig = config.getWhatsAppConfig();
    const isWaSetup = waConfig && waConfig.enabled;

    const setupWhatsApp = await confirm({
        message: isWaSetup
            ? 'WhatsApp is already configured. Re-configure? (Existing config will be overwritten)'
            : 'Do you want to setup WhatsApp integration now? (Requires QR scan)',
        default: false,
    });

    if (!setupWhatsApp && isWaSetup) {
        console.log(chalk.dim('\nKeeping existing WhatsApp configuration.\n'));
    }

    if (setupWhatsApp) {
        console.log(chalk.blue('\nStarting WhatsApp Setup...\n'));

        const allowedNumbersInput = await input({
            message:
                'Enter allowed phone numbers (comma separated, e.g. 1234567890@c.us). Leave empty to allow ALL (not recommended):',
            default:
                isWaSetup && waConfig?.allowedNumbers
                    ? waConfig.allowedNumbers.join(',')
                    : undefined,
        });

        const nums = allowedNumbersInput
            ? allowedNumbersInput
                .split(',')
                .map((s) => s.trim())
                .filter((s) => s.length > 0)
            : undefined;

        config.setWhatsAppConfig(true, nums);

        try {
            const { WhatsAppService } = await import(
                '../../external-apps/whatsapp.js'
            );

            const wa = new WhatsAppService();
            await wa.setup();

            console.log(
                chalk.yellow('\nScan the QR code above to complete setup.\n')
            );
            console.log(
                chalk.green(
                    'After scanning, you can start the daemon to run the agent.\n'
                )
            );
        } catch (e: any) {
            console.error(chalk.red(`Error setting up WhatsApp: ${e.message}`));
        }
    }

    console.log(chalk.green('Setup complete.\n')); 2
}
