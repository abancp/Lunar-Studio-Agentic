#!/usr/bin/env node
import { Command } from 'commander';
import { setupCommand } from './setup.js';
import { chatCommand } from './chat.js';
import { listModelsCommand } from './list-models.js';

const program = new Command();

program
    .name('llm-engine')
    .description('LLI Engine CLI with MCP Support')
    .version('1.0.0');

program
    .command('setup')
    .description('Configure API keys and default models for LLM providers')
    .action(setupCommand);

program
    .command('chat')
    .description('Start an interactive chat session with the configured LLM')
    .action(chatCommand);

program
    .command('list-models')
    .description('List available models for the configured provider')
    .action(listModelsCommand);

program.parse(process.argv);
