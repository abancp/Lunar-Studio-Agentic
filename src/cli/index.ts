#!/usr/bin/env node
import { Command } from 'commander';
import { setupCommand } from './setup.js';
import { chatCommand } from './chat.js';
import { listModelsCommand } from './list-models.js';
import { memoriesCommand } from './memories.js';

const program = new Command();

program
    .name('lunarstudio')
    .description('Lunar Studio CLI ')
    .version('1.0.0');

program
    .command('setup [target]')
    .description('Configure the agent (target: llm, whatsapp, people)')
    .action((target) => setupCommand(target));

program
    .command('chat')
    .description('Start an interactive chat session with the configured LLM')
    .action(chatCommand);

program
    .command('list-models')
    .description('List available models for the configured provider')
    .action(listModelsCommand);

program
    .command('memories')
    .description('View stored memories')
    .option('-p, --person <name>', 'Filter by person name (or "owner")')
    .action((options) => memoriesCommand(options));

program
    .command('daemon')
    .description('Start the long-running agent daemon (WhatsApp, etc.)')
    .action(async () => {
        const { startDaemon } = await import('../index.js');
        await startDaemon();
    });

program.parse(process.argv);
