import chalk from 'chalk';
import * as config from './config.js';
import { createLLM } from '../../llm/factory.js';

export async function listModelsCommand() {
    const provider = config.getProvider();

    if (!provider) {
        console.log(chalk.red('No provider configured. Run "setup" first.'));
        return;
    }

    const currentModel = config.getDefaultModel(provider);

    console.log(chalk.bold(`Current Provider: ${chalk.cyan(provider)}`));
    console.log(chalk.bold(`Current Model: ${chalk.green(currentModel || 'Default')}`));

    console.log('\nAvailable Models:');

    try {
        const apiKey = config.getApiKey(provider);
        if (apiKey) {
            const llm = createLLM(provider, apiKey, 'default');
            if (llm.listModels) {
                const models = await llm.listModels();
                console.log(chalk.yellow(`${provider} (Fetched):`));
                models.forEach((m: string) => console.log(`- ${m}`));
                return;
            }
        }
    } catch (e) {
        console.log(chalk.red('Failed to fetch models dynamically, showing defaults.'));
    }

    if (provider === 'openai') {
        console.log(chalk.yellow('OpenAI:'));
        console.log('- gpt-4o');
        console.log('- gpt-4-turbo');
        console.log('- gpt-3.5-turbo');
    } else if (provider === 'google') {
        console.log(chalk.yellow('Google:'));
        console.log('- gemini-1.5-pro');
        console.log('- gemini-1.5-flash');
        console.log('- gemini-1.0-pro');
    } else if (provider === 'antigravity') {
        console.log(chalk.yellow('Antigravity:'));
        console.log('- ag-model-1');
        console.log('- ag-model-2-beta');
        console.log('- ag-r1-reasoning');
    }
}
