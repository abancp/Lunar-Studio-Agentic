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
}
