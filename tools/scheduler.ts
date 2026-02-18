import { z } from 'zod';
import { scheduler } from '../src/cronjobs.js';

export const scheduleTool = {
    name: 'schedule_task',
    description: 'Schedule a tool to run at a specific time or on a recurring basis. Use this for reminders, daily updates, or delayed actions.',
    schema: z.object({
        toolName: z.string().describe('The name of the tool to execute (e.g., "send_whatsapp_message")'),
        toolArgs: z.string().describe('JSON string of arguments for the tool'),
        executionTime: z.string().describe('ISO date string for one-time execution, OR a cron expression (e.g., "0 9 * * *" for daily at 9am)'),
        recurrence: z.string().optional().describe('Human-readable description of recurrence (e.g. "daily")'),
    }),
    execute: async ({ toolName, toolArgs, executionTime, recurrence }: { toolName: string; toolArgs: string; executionTime: string; recurrence?: string }) => {

        let parsedArgs: any;
        try {
            parsedArgs = JSON.parse(toolArgs);
        } catch (e) {
            return `Error: toolArgs must be valid JSON string.`;
        }

        // Determine type of schedule
        let type: 'cron' | 'date' = 'date';
        let value: string | Date = executionTime;

        // Simple heuristic: if it has spaces, it's likely a cron expression, else try date
        if (executionTime.includes(' ')) {
            type = 'cron';
            value = executionTime;
        } else {
            type = 'date';
            const date = new Date(executionTime);
            if (isNaN(date.getTime())) {
                return `Error: Invalid date format "${executionTime}". Use ISO format (YYYY-MM-DDTHH:mm:ss.sssZ) or a valid cron expression.`;
            }
            value = date;
        }

        try {
            const jobId = await scheduler.scheduleTask(type, value, toolName, parsedArgs);
            return `Task scheduled successfully! ID: ${jobId}. Will run ${toolName} at ${executionTime}.`;
        } catch (e: any) {
            return `Failed to schedule task: ${e.message}`;
        }
    },
};

export const listScheduledTasksTool = {
    name: 'list_scheduled_tasks',
    description: 'List all currently scheduled tasks.',
    schema: z.object({}),
    execute: async () => {
        const jobs = scheduler.listTasks();
        if (jobs.length === 0) return "No scheduled tasks.";

        return jobs.map(j => `ID: ${j.id} | Tool: ${j.tool} | When: ${j.value} | Type: ${j.type}`).join('\n');
    }
};

export const cancelScheduledTaskTool = {
    name: 'cancel_scheduled_task',
    description: 'Cancel a scheduled task by ID.',
    schema: z.object({
        id: z.string().describe('The ID of the task to cancel'),
    }),
    execute: async ({ id }: { id: string }) => {
        if (scheduler.cancelTask(id)) {
            return `Task ${id} cancelled.`;
        }
        return `Task ${id} not found.`;
    }
};
