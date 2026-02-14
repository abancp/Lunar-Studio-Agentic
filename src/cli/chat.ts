import inquirer from 'inquirer';
import chalk from 'chalk';
import * as config from './config.js';
import { createLLM } from '../../llm/factory.js';
import { tools, getTool } from '../../tools/index.js';

export async function chatCommand() {
    let providerName = config.getProvider();

    // Interactive selection if no provider configured or user wants to switch (conceptually, though here we just check if missing)
    if (!providerName) {
        const answers = await inquirer.prompt([
            {
                type: 'list',
                name: 'provider',
                message: 'Select LLM provider:',
                choices: ['openai', 'google', 'antigravity'],
            }
        ]);
        providerName = answers.provider as config.Provider;
        // Optionally save as default? asking usually better.
        // For now, let's just use it for the session or save if setup wasn't run.
        config.setProvider(providerName);
    }

    let apiKey = config.getApiKey(providerName as config.Provider);
    if (!apiKey) {
        const answers = await inquirer.prompt([
            {
                type: 'password',
                name: 'apiKey',
                message: `Enter API Key for ${providerName}:`,
                validate: (input: string) => input.trim().length > 0 || 'API Key required',
            }
        ]);
        apiKey = answers.apiKey;
        config.setApiKey(providerName as config.Provider, apiKey!);
    }

    let model = config.getDefaultModel(providerName as config.Provider);
    if (!model) {
        let choices: string[] = ['default'];

        // Try to fetch models dynamically
        try {
            // we need a temporary instance to fetch models if possible, or use a static helper
            // but factory needs key and model. 
            // Let's rely on hardcoded defaults for initial setup if no key, 
            // OR if we have key, try to list.
            if (apiKey) {
                const tempLLM = createLLM(providerName!, apiKey, 'default');
                if (tempLLM.listModels) {
                    const models = await tempLLM.listModels();
                    if (models && models.length > 0) {
                        choices = models;
                    }
                }
            }
        } catch (e) {
            // Fallback to defaults if fetch fails
        }

        if (choices.length === 1 && choices[0] === 'default') {
            const defaultModels: Record<string, string[]> = {
                'openai': ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
                'google': ['gemini-1.5-pro', 'gemini-1.5-flash'],
                'antigravity': ['ag-model-1', 'ag-model-2-beta']
            };
            choices = defaultModels[providerName as string] || ['default'];
        }

        const answers = await inquirer.prompt([
            {
                type: 'list',
                name: 'model',
                message: `Select model for ${providerName}:`,
                choices: choices,
            }
        ]);
        model = answers.model;
        config.setDefaultModel(providerName as config.Provider, model!);
    }

    console.log(chalk.blue(`Starting chat with ${providerName} (${model})...`));
    console.log(chalk.gray('Type "exit" or "quit" to stop.'));

    try {
        const llm = createLLM(providerName as string, (apiKey || '') as string, (model || '') as string);

        while (true) {
            const { prompt } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'prompt',
                    message: chalk.green('You:'),
                },
            ]);

            if (['exit', 'quit'].includes(prompt.toLowerCase().trim())) {
                console.log(chalk.blue('Goodbye!'));
                break;
            }

            process.stdout.write(chalk.yellow('AI: '));

            try {
                const response = await llm.generate(prompt, tools);

                // Check for tool calls (simple JSON check as per my provider implementation)
                let finalResponse = response;

                try {
                    const parsed = JSON.parse(response);
                    if (parsed.tool_calls) {
                        console.log(chalk.dim('\n[Tool Call Detected]'));
                        for (const call of parsed.tool_calls) {
                            const toolName = call.function.name;
                            const args = JSON.parse(call.function.arguments);
                            console.log(chalk.dim(`Executing ${toolName} with args: ${JSON.stringify(args)}`));

                            const tool = getTool(toolName);
                            if (tool) {
                                const result = await tool.execute(args);
                                console.log(chalk.dim(`Result: ${result}`));
                                // In a real loop, we'd feed this back. For now, just showing it.
                                finalResponse = `(Tool executed: ${toolName}) Result: ${result}`;
                            } else {
                                console.log(chalk.red(`Tool ${toolName} not found.`));
                            }
                        }
                    }
                } catch (e) {
                    // Not JSON or not tool call, just normal text
                }

                console.log(finalResponse);

            } catch (error) {
                console.error(chalk.red('Error generating response:'), error);
            }
        }

    } catch (error) {
        console.error(chalk.red('Failed to initialize LLM:'), error);
    }
}
