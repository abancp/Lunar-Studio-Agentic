import chalk from 'chalk';
import * as config from './config.js';
import { select, input, password, confirm } from '@inquirer/prompts';
import { createLLM } from '../../llm/factory.js';

export async function setupLLM() {
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
        groq: 'openai/gpt-oss-120b',
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
}

export async function setupWhatsApp() {
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
        return;
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
}

export async function setupPeople() {
    console.log(chalk.blue('\nStarting People Setup...\n'));

    const { PeopleManager } = await import('../peoples.js');
    const peopleManager = new PeopleManager();

    let addMore = true;
    while (addMore) {
        const mode = await select({
            message: 'How do you want to add a person?',
            choices: [
                { name: 'Manual Entry', value: 'manual' },
                { name: 'AI Interview (Experimental)', value: 'ai' },
                { name: 'Finish', value: 'exit' },
            ],
        });

        if (mode === 'exit') {
            addMore = false;
            break;
        }

        if (mode === 'manual') {
            console.log(chalk.cyan('\nEnter Person Details:\n'));
            const name = await input({ message: 'Name:' });
            const relation = await input({ message: 'Relation (e.g., Friend, Boss):' });
            const phone = await input({ message: 'WhatsApp Number (optional, e.g., 1234567890@c.us):' });
            const notes = await input({ message: 'Notes/Behaviors (optional, e.g., "likes memes, talks casually"):' });

            // Memory access control
            const existingPeople = peopleManager.getPeople();
            const memoryAccessChoice = await select({
                message: `Who can access ${name}'s memories?`,
                choices: [
                    { name: 'Only Owner (CLI user)', value: 'owner' },
                    { name: `${name} + Owner`, value: 'self_owner' },
                    { name: 'Everyone (all configured people)', value: 'all' },
                    { name: 'Custom (pick specific people)', value: 'custom' },
                ],
            });

            let memoryAccessibleBy: string[] = ['owner'];
            if (memoryAccessChoice === 'self_owner') {
                memoryAccessibleBy = ['owner', '__SELF__']; // __SELF__ resolved after person is created
            } else if (memoryAccessChoice === 'all') {
                memoryAccessibleBy = ['*'];
            } else if (memoryAccessChoice === 'custom') {
                const choices = [
                    { name: 'Owner (CLI user)', value: 'owner' },
                    ...existingPeople.map(p => ({ name: `${p.name} (${p.relation})`, value: p.id })),
                ];
                if (choices.length > 1) {
                    const selected = await input({
                        message: 'Enter person names to grant access (comma separated):',
                    });
                    const selectedNames = selected.split(',').map(s => s.trim().toLowerCase());
                    memoryAccessibleBy = ['owner'];
                    for (const n of selectedNames) {
                        const match = existingPeople.find(p => p.name.toLowerCase() === n);
                        if (match) memoryAccessibleBy.push(match.id);
                    }
                    memoryAccessibleBy.push('__SELF__');
                } else {
                    memoryAccessibleBy = ['owner', '__SELF__'];
                }
            }

            const newPerson = peopleManager.addPerson({
                name,
                relation,
                whatsappNumber: phone || undefined,
                notes: notes || undefined,
                memoryAccessibleBy,
            });

            // Replace __SELF__ placeholder with actual person ID
            if (newPerson.memoryAccessibleBy?.includes('__SELF__')) {
                newPerson.memoryAccessibleBy = newPerson.memoryAccessibleBy.map(
                    id => id === '__SELF__' ? newPerson.id : id
                );
                peopleManager.updatePerson(newPerson.id, { memoryAccessibleBy: newPerson.memoryAccessibleBy });
            }

            // Seed initial memories from config
            const { MemoryManager } = await import('../memory.js');
            const memoryManager = new MemoryManager();

            memoryManager.addMemory(`${name}'s relation: ${relation}`, newPerson.id);
            if (notes) {
                // Split notes by comma/period for granular memories
                const noteItems = notes.split(/[,.]/).map(s => s.trim()).filter(s => s.length > 0);
                for (const note of noteItems) {
                    memoryManager.addMemory(`${name}: ${note}`, newPerson.id);
                }
            }
            if (phone) {
                memoryManager.addMemory(`${name}'s WhatsApp: ${phone}`, newPerson.id);
            }

            console.log(chalk.green(`\n✔ Added ${name} to configuration with ${notes ? 'seeded' : 'no'} memories.`));
        } else if (mode === 'ai') {
            console.log(chalk.magenta('\nStarting AI Interview...'));
            console.log(chalk.dim('(Type "exit" to cancel at any time)\n'));

            const providerName = config.getProvider();
            const apiKey = config.getApiKey(providerName!);

            if (!providerName || !apiKey) {
                console.log(chalk.red('Error: LLM Provider not configured. Please skip and configure provider first.'));
                continue;
            }

            try {
                const llm = createLLM(providerName, apiKey);
                const history: { role: 'system' | 'user' | 'assistant', content: string }[] = [
                    {
                        role: 'system',
                        content: `You are a configuration assistant. Your goal is to extract details about a person the user knows.
                        Required fields: Name, Relation.
                        Optional fields: WhatsApp Number, Notes/Behaviors.
                        
                        Ask questions one by one to gather this information. Be friendly.
                        Also try to learn about their personality, typing style, and behaviors.
                        When you have enough information (at least Name and Relation), output ONLY a JSON object in this format:
                        { "COMPLETE": true, "data": { "name": "...", "relation": "...", "whatsappNumber": "...", "notes": "..." } }
                        
                        If the user wants to cancel, output { "CANCEL": true }.
                        Do not output markdown code blocks for the JSON. Just the raw JSON string.`
                    },
                    { role: 'assistant', content: "Who would you like to add related to you?" }
                ];

                console.log(chalk.green('AI: Who would you like to add related to you?'));

                let aiLoop = true;
                while (aiLoop) {
                    const userResponse = await input({ message: 'You:' });
                    if (userResponse.toLowerCase() === 'exit') {
                        aiLoop = false;
                        break;
                    }

                    history.push({ role: 'user', content: userResponse });

                    console.log(chalk.dim('Thinking...'));
                    const response = await llm.generate(history as any);

                    const content = response.content || '';

                    // Check for JSON
                    try {
                        const jsonMatch = content.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            const jsonStr = jsonMatch[0];
                            const data = JSON.parse(jsonStr);
                            if (data.CANCEL) {
                                console.log(chalk.yellow('Operation cancelled.'));
                                aiLoop = false;
                                break;
                            }
                            if (data.COMPLETE && data.data) {
                                const newPerson = peopleManager.addPerson({
                                    ...data.data,
                                    memoryAccessibleBy: ['owner', '__SELF__'],
                                });

                                // Replace __SELF__
                                if (newPerson.memoryAccessibleBy?.includes('__SELF__')) {
                                    newPerson.memoryAccessibleBy = newPerson.memoryAccessibleBy.map(
                                        id => id === '__SELF__' ? newPerson.id : id
                                    );
                                    peopleManager.updatePerson(newPerson.id, { memoryAccessibleBy: newPerson.memoryAccessibleBy });
                                }

                                // Seed memories
                                const { MemoryManager } = await import('../memory.js');
                                const memoryManager = new MemoryManager();
                                memoryManager.addMemory(`${data.data.name}'s relation: ${data.data.relation}`, newPerson.id);
                                if (data.data.notes) {
                                    const noteItems = data.data.notes.split(/[,.]/).map((s: string) => s.trim()).filter((s: string) => s.length > 0);
                                    for (const note of noteItems) {
                                        memoryManager.addMemory(`${data.data.name}: ${note}`, newPerson.id);
                                    }
                                }
                                if (data.data.whatsappNumber) {
                                    memoryManager.addMemory(`${data.data.name}'s WhatsApp: ${data.data.whatsappNumber}`, newPerson.id);
                                }

                                console.log(chalk.green(`\n✔ Added ${data.data.name} (${data.data.relation}) with seeded memories.`));
                                aiLoop = false;
                                break;
                            }
                        }
                    } catch (e) {
                        // ignore, likely just text
                    }

                    console.log(chalk.green(`AI: ${content}`));
                    history.push({ role: 'assistant', content });
                }

            } catch (e: any) {
                console.error(chalk.red(`AI Error: ${e.message}`));
            }
        }
    }
}


export async function setupCommand(target?: string, options?: any) {
    if (target === 'llm') {
        await setupLLM();
    } else if (target === 'whatsapp') {
        await setupWhatsApp();
    } else if (target === 'peoples' || target === 'people') {
        await setupPeople();
    } else {
        // Run all
        await setupLLM();

        // Ask for WhatsApp only if running full setup (mimicking previous flow but using the function)
        // We can just call setupWhatsApp which asks the user internally if they want to setup
        await setupWhatsApp();

        // Ask for People
        const doPeople = await confirm({
            message: 'Do you want to setup people now? (y/N)',
            default: false,
        });
        if (doPeople) {
            await setupPeople();
        }

        console.log(chalk.green('Setup complete.\n'));
    }
}
