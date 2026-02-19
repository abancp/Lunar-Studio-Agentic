
import { Command } from 'commander';
import chalk from 'chalk';
import WebSocket from 'ws';
import { logger } from '../log.js';

function connectAndRequest(request: any, onMessage: (msg: any, resolve: () => void) => void): Promise<void> {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket('ws://localhost:3210');

        const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('Connection timed out. Is the daemon running?'));
        }, 5000);

        ws.on('open', () => {
            ws.send(JSON.stringify(request));
        });

        ws.on('message', (data) => {
            try {
                const msg = JSON.parse(data.toString());
                if (msg.type === 'error') {
                    console.error(chalk.red(`Error: ${msg.message}`));
                    clearTimeout(timeout);
                    ws.close();
                    resolve(); // Resolve to exit cleanly even on error
                    return;
                }
                // Ignore welcome/status messages
                if (msg.type === 'welcome' || msg.type === 'status') return;

                onMessage(msg, () => {
                    clearTimeout(timeout);
                    ws.close();
                    resolve();
                });
            } catch (e) {
                // ignore invalid json from server?
            }
        });

        ws.on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
        });
    });
}

export function contextCommand(program: Command) {
    const cmd = program.command('context')
        .description('Manage agent context and history');

    cmd.command('list')
        .description('List active chat sessions')
        .action(async () => {
            try {
                await connectAndRequest({ type: 'get_sessions' }, (msg, done) => {
                    if (msg.type === 'sessions') {
                        if (msg.sessions.length === 0) {
                            console.log(chalk.yellow('No active sessions found.'));
                        } else {
                            console.log(chalk.bold('\nActive Sessions (Chat IDs):'));
                            msg.sessions.forEach((s: string) => console.log(chalk.cyan(`- ${s}`)));
                            console.log('');
                        }
                        done();
                    }
                });
            } catch (e: any) {
                console.error(chalk.red(`Failed to connect: ${e.message}`));
            }
        });

    cmd.command('show <chatId>')
        .description('Show history for a specific chat ID')
        .action(async (chatId) => {
            try {
                await connectAndRequest({ type: 'get_history', chatId }, (msg, done) => {
                    if (msg.type === 'history') {
                        console.log(chalk.bold(`\nHistory for ${msg.chatId}:`));
                        msg.messages.forEach((m: any, idx: number) => {
                            const roleColor = m.role === 'user' ? chalk.green : m.role === 'assistant' ? chalk.blue : chalk.gray;
                            console.log(`${chalk.dim(idx + 1 + '.')} ${roleColor(m.role.toUpperCase())}: ${m.content ? m.content.substring(0, 100).replace(/\n/g, ' ') + (m.content.length > 100 ? '...' : '') : '[No Content]'}`);
                            if (m.tool_calls) {
                                console.log(chalk.yellow(`  [Tool Calls: ${m.tool_calls.map((t: any) => t.function.name).join(', ')}]`));
                            }
                        });
                        console.log('');
                        done();
                    }
                });
            } catch (e: any) {
                console.error(chalk.red(`Failed: ${e.message}`));
            }
        });

    cmd.command('clear <chatId>')
        .description('Clear history for a specific chat ID')
        .action(async (chatId) => {
            try {
                await connectAndRequest({ type: 'clear_history', chatId }, (msg, done) => {
                    if (msg.type === 'history_cleared') {
                        console.log(chalk.green(`History cleared for ${chatId}`));
                        done();
                    }
                });
            } catch (e: any) {
                console.error(chalk.red(`Failed: ${e.message}`));
            }
        });

    cmd.command('pop <chatId>')
        .description('Remove the last message from history (undo)')
        .action(async (chatId) => {
            try {
                await connectAndRequest({ type: 'pop_history', chatId }, (msg, done) => {
                    if (msg.type === 'history_popped') {
                        console.log(chalk.green(`Last message removed for ${chatId}`));
                        done();
                    }
                });
            } catch (e: any) {
                console.error(chalk.red(`Failed: ${e.message}`));
            }
        });
}
