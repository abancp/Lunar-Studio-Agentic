import inquirer from 'inquirer';
import chalk from 'chalk';
import * as config from './config.js';
import { createLLM } from '../../llm/factory.js';
import { tools, getTool } from '../../tools/index.js';
import { HistoryManager } from './history.js';
import { AGENTIC_SYSTEM_PROMPT } from '../../llm/system.js';

export async function chatCommand() {
    let providerName = config.getProvider();

    // Interactive selection if no provider configured
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
        try {
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
            // Fallback
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
        const history = new HistoryManager(AGENTIC_SYSTEM_PROMPT);

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

            // Add user message to history
            history.addUserMessage(prompt);

            process.stdout.write(chalk.yellow('AI: '));

            // Tool execution loop
            let keepGenerating = true;
            while (keepGenerating) {
                keepGenerating = false; // default to stop unless tool call forces another turn

                try {
                    const response = await llm.generate(history.getMessages(), tools);

                    // Display response content if any
                    if (response.content) {
                        console.log(response.content);
                    }

                    // Add assistant response to history
                    history.addMessage(response.role, response.content, response.tool_calls);

                    // Handle tool calls
                    if (response.tool_calls && response.tool_calls.length > 0) {
                        console.log(chalk.dim('\n[Tool Call Detected]'));

                        for (const call of response.tool_calls) {
                            const toolName = call.function.name;
                            const argsStr = call.function.arguments;
                            let args = {};
                            try {
                                args = JSON.parse(argsStr);
                            } catch (e) {
                                console.error(chalk.red(`Failed to parse arguments for ${toolName}: ${argsStr}`));
                            }

                            console.log(chalk.dim(`Executing ${toolName} with args: ${argsStr}`));

                            const tool = getTool(toolName);
                            let result = "Tool not found.";
                            if (tool) {
                                try {
                                    const executionResult = await tool.execute(args);
                                    result = typeof executionResult === 'string' ? executionResult : JSON.stringify(executionResult);
                                } catch (err: any) {
                                    result = `Error executing tool: ${err.message}`;
                                    console.error(chalk.red(result));
                                }
                            } else {
                                console.log(chalk.red(`Tool ${toolName} not found.`));
                            }

                            console.log(chalk.dim(`Result: ${result.substring(0, 100)}...`));

                            // Add tool result to history
                            history.addToolResult(call.id, toolName, result);
                        }

                        // If we had tool calls, we must trigger generation again to let LLM see the results
                        keepGenerating = true;
                    }

                } catch (error) {
                    console.error(chalk.red('\nError generating response:'), error);
                    keepGenerating = false;
                }
            }
        }

    } catch (error) {
        console.error(chalk.red('Failed to initialize LLM:'), error);
    }
}

