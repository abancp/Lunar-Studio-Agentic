import { z } from 'zod';
import { Tool } from '../llm/types.js';
import { workspaceTools } from './workspace.js';
import { diagramTool } from './diagram.js';
import { animationTool } from './animation.js';
import { sendWhatsAppTool } from './whatsapp_send.js';
import { scheduleTool, listScheduledTasksTool, cancelScheduledTaskTool } from './scheduler.js';
import { documentGeneratorTool } from './document_generator.js';

export const tools: Tool[] = [
    ...workspaceTools,
    diagramTool,
    animationTool,
    sendWhatsAppTool,
    scheduleTool,
    listScheduledTasksTool,
    cancelScheduledTaskTool,
    documentGeneratorTool,
    {
        name: 'calculator',
        description: 'Perform simple calculations',
        schema: z.object({
            expression: z.string().describe('The mathematical expression to evaluate'),
        }),
        execute: async ({ expression }) => {
            // DANGER: eval is dangerous, but for a mock tool in a local CLI it's acceptable for now
            // In production, use a safe math parser
            try {
                console.log(expression)
                return eval(expression).toString();
            } catch (e) {
                return `Error evaluating expression: ${e}`;
            }
        },
    },
    {
        name: 'weather',
        description: 'Get current weather for a location',
        schema: z.object({
            location: z.string().describe('The city and state, e.g. San Francisco, CA'),
        }),
        execute: async ({ location }) => {
            console.log("Function weather", location)
            return `The weather in ${location} is sunny and 75°F.`;
        },
    },
];

export function getTool(name: string): Tool | undefined {
    return tools.find((t) => t.name === name);
}
