
import schedule from 'node-schedule';
import { v4 as uuidv4 } from 'uuid';
import * as config from './cli/config.js';
import { logger } from './log.js';
// import { getTool } from '../tools/index.js'; // REMOVE CYCLE

export class Scheduler {
    private loaded: boolean = false;
    private toolRetriever: ((name: string) => any) | null = null;

    constructor() {
    }

    initialize(toolRetriever: (name: string) => any) {
        this.toolRetriever = toolRetriever;
        if (this.loaded) return;
        this.loadJobs();
        this.loaded = true;
        logger.info('Scheduler initialized.');
    }

    private loadJobs() {
        const jobs = config.getJobs();
        let loadedCount = 0;
        const now = Date.now();

        // 1. Filter out expired one-time jobs
        const validJobs: config.ScheduledJob[] = [];

        jobs.forEach(job => {
            if (job.type === 'date') {
                const jobTime = new Date(job.value).getTime();
                if (jobTime < now) {
                    logger.info(`Skipping expired job ${job.id} (${job.tool})`);
                    return; // Don't re-schedule or save
                }
            }
            validJobs.push(job);
            this.scheduleJobInternal(job);
            loadedCount++;
        });

        // Update config if we pruned any jobs
        if (validJobs.length !== jobs.length) {
            config.setJobs(validJobs);
        }

        logger.info(`Loaded ${loadedCount} scheduled jobs.`);
    }

    async scheduleTask(type: 'cron' | 'date', value: string | Date, toolName: string, args: any): Promise<string> {
        const id = uuidv4();
        const valueStr = value instanceof Date ? value.toISOString() : value;

        const job: config.ScheduledJob = {
            id,
            type,
            value: valueStr,
            tool: toolName,
            args,
            createdAt: Date.now()
        };

        // Persist
        const jobs = config.getJobs();
        jobs.push(job);
        config.setJobs(jobs);

        // Schedule
        this.scheduleJobInternal(job);

        logger.info(`Scheduled new job ${id}: ${toolName} @ ${valueStr}`);
        return id;
    }

    private scheduleJobInternal(job: config.ScheduledJob) {
        let rule: string | Date;
        if (job.type === 'date') {
            rule = new Date(job.value);
        } else {
            rule = job.value;
        }

        schedule.scheduleJob(job.id, rule, async () => {
            await this.executeJob(job);
        });
    }

    private async executeJob(job: config.ScheduledJob) {
        logger.info(`Executing scheduled job ${job.id}: ${job.tool}`);

        if (!this.toolRetriever) {
            logger.error(`Job ${job.id} failed: Scheduler not initialized with tool retriever.`);
            return;
        }

        const tool = this.toolRetriever(job.tool);
        if (!tool) {
            logger.error(`Job ${job.id} failed: Tool ${job.tool} not found.`);
            return;
        }

        try {
            const result = await tool.execute(job.args);
            logger.info(`Job ${job.id} executed successfully. Result: ${typeof result === 'string' ? result.substring(0, 100) : 'JSON'}`);
        } catch (err: any) {
            logger.error(`Job ${job.id} execution failed: ${err.message}`);
        }

        // If it was a one-time date job, remove it from config
        if (job.type === 'date') {
            this.removeJobFromConfig(job.id);
        }
    }

    cancelTask(id: string): boolean {
        const job = schedule.scheduledJobs[id];
        let cancelled = false;
        if (job) {
            job.cancel();
            cancelled = true;
            logger.info(`Cancelled running job ${id}`);
        }

        // Remove from config regardless of whether it was running (CLI usage)
        const jobs = config.getJobs();
        const exists = jobs.some(j => j.id === id);
        if (exists) {
            this.removeJobFromConfig(id);
            logger.info(`Removed job ${id} from config`);
            return true;
        }

        return cancelled;
    }

    private removeJobFromConfig(id: string) {
        const jobs = config.getJobs();
        const newJobs = jobs.filter(j => j.id !== id);
        config.setJobs(newJobs);
    }

    listTasks(): config.ScheduledJob[] {
        return config.getJobs();
    }
}

export const scheduler = new Scheduler();
