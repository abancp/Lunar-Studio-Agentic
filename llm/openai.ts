import OpenAI from 'openai';
import { LLMProvider, Tool } from './types.js';
import { zodResponseFormat } from 'openai/helpers/zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export class OpenAIProvider implements LLMProvider {
    private client: OpenAI;
    private model: string;

    constructor(apiKey: string, model: string = 'gpt-4o') {
        this.client = new OpenAI({ apiKey });
        this.model = model;
    }

    async generate(prompt: string, tools?: Tool[]): Promise<string> {
        const response = await this.client.chat.completions.create({
            model: this.model,
            messages: [{ role: 'user', content: prompt }],
            tools: tools?.map((tool) => ({
                type: 'function',
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: zodToJsonSchema(tool.schema as any) as any,
                },
            })),
        });

        const choice = response.choices[0];
        if (!choice) return "No response generated.";

        const content = choice.message.content;
        if (content) return content;

        // Check for tool calls
        const toolCalls = choice.message.tool_calls;
        if (toolCalls && toolCalls.length > 0) {
            // For simplicity in this iteration, we return a JSON string describing the tool call
            // In a real application, we would execute the tool here or return a specific structure
            return JSON.stringify({ tool_calls: toolCalls });
        }

        return "No content generated.";
    }

    async *stream(prompt: string, tools?: Tool[]): AsyncGenerator<string> {
        const stream = await this.client.chat.completions.create({
            model: this.model,
            messages: [{ role: 'user', content: prompt }],
            stream: true,
            tools: tools?.map((tool) => ({
                type: 'function',
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: zodToJsonSchema(tool.schema as any) as any,
                },
            })),
        });

        for await (const chunk of stream) {
            if (chunk.choices[0]?.delta?.content) {
                yield chunk.choices[0].delta.content;
            }
        }
    }

    async listModels(): Promise<string[]> {
        const models = await this.client.models.list();
        return models.data.map(m => m.id);
    }
}
