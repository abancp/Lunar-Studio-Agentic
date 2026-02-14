import OpenAI from 'openai';
import { LLMProvider, Tool, Message, MessageRole } from './types.js';
import { zodResponseFormat } from 'openai/helpers/zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export class OpenAIProvider implements LLMProvider {
    private client: OpenAI;
    private model: string;

    constructor(apiKey: string, model: string = 'gpt-4o') {
        this.client = new OpenAI({ apiKey });
        this.model = model;
    }

    async generate(messages: Message[], tools?: Tool[]): Promise<Message> {
        const openaiMessages: any[] = messages.map(m => ({
            role: m.role,
            content: m.content,
            tool_calls: m.tool_calls,
            tool_call_id: m.tool_call_id,
            name: m.name
        }));

        const response = await this.client.chat.completions.create({
            model: this.model,
            messages: openaiMessages,
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
        if (!choice) return { role: 'assistant', content: "No response generated." };

        const msg = choice.message;

        const result: Message = {
            role: 'assistant',
            content: msg.content,
        };

        if (msg.tool_calls) {
            result.tool_calls = msg.tool_calls.map((tc: any) => ({
                id: tc.id,
                type: 'function',
                function: {
                    name: tc.function.name,
                    arguments: tc.function.arguments,
                }
            }));
        }

        return result;
    }

    async *stream(messages: Message[], tools?: Tool[]): AsyncGenerator<string> {
        const openaiMessages: any[] = messages.map(m => ({
            role: m.role,
            content: m.content,
            tool_calls: m.tool_calls,
            tool_call_id: m.tool_call_id,
            name: m.name
        }));

        const stream = await this.client.chat.completions.create({
            model: this.model,
            messages: openaiMessages,
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
