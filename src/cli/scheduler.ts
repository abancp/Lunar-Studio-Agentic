import { Command } from 'commander';
import chalk from 'chalk';
import * as config from './config.js';
import { scheduler } from '../cronjobs.js';
import { logger } from '../log.js';

export function schedulerCommand(program: Command) {
    const cmd = program.command('schedule')
        .description('Manage scheduled tasks');

    cmd.command('list')
        .description('List all scheduled tasks')
        .action(async () => {
            const jobs = config.getJobs();
            if (jobs.length === 0) {
                console.log(chalk.yellow('No scheduled tasks found.'));
                return;
            }

            console.log(chalk.bold('\nScheduled Tasks:'));
            jobs.forEach(job => {
                const time = job.type === 'cron' ? `Cron: ${job.value}` : `Date: ${new Date(job.value).toLocaleString()}`;
                console.log(chalk.cyan(`\nID: ${job.id}`));
                console.log(`  Tool: ${chalk.green(job.tool)}`);
                console.log(`  When: ${time}`);
                console.log(`  Args: ${JSON.stringify(job.args)}`);
            });
            console.log('');
        });

    cmd.command('cancel <id>')
        .description('Cancel a scheduled task by ID')
        .action(async (id) => {
            // Since CLI is a separate process from daemon, the in-memory cancel won't work on daemon jobs.
            // But removeJobFromConfig logic we added handles removing from DB.
            // The daemon won't pick this up until restart or if we implement a watcher (future work).

            // We use the scheduler instance to leverage the removal logic
            const removed = scheduler.cancelTask(id);

            if (removed) {
                console.log(chalk.green(`Task ${id} removed from configuration.`));
                console.log(chalk.yellow('Note: If the daemon is running, restart it to ensure the job is stopped from memory immediately.'));
            } else {
                console.log(chalk.red(`Task ${id} not found.`));
            }
        });
}
