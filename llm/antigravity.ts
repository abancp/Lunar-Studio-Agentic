import { OpenAI } from 'openai';
import { LLMProvider, Tool } from './types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

export class AntigravityProvider implements LLMProvider {
    private client: OpenAI;
    private modelName: string;

    constructor(apiKey: string, modelName: string = 'ag-model-1') {
        // Assuming Antigravity uses OpenAI-compatible API
        // If there's a specific base URL, it should be configured here.
        // For now, I'll default to a placeholder base URL or just standard OpenAI if not specified.
        // Since I don't have the real URL, I will assume it might be a custom endpoint.
        // If it's just a different model on OpenAI, this works.
        // If it's a different service found at a specific URL, I'd need that URL.
        // I will use a placeholder BASE_URL for "Antigravity" if provided, otherwise default.

        // For this task, I'll instantiate it like OpenAI but perhaps with a custom baseURL if I knew it.
        // I'll leave it as standard OpenAI client for now but customizable.
        this.client = new OpenAI({
            apiKey: apiKey,
            // baseURL: 'https://api.antigravity.ai/v1', // Example
        });
        this.modelName = modelName;
    }

    async generate(prompt: string, tools?: Tool[]): Promise<string> {
        const params: any = {
            model: this.modelName,
            messages: [{ role: 'user', content: prompt }],
        };

        if (tools && tools.length > 0) {
            params.tools = tools.map(tool => ({
                type: 'function',
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: zodToJsonSchema(tool.schema as any),
                },
            }));
        }

        const completion = await this.client.chat.completions.create(params);
        return completion.choices[0]?.message?.content || '';
    }

    async *stream(prompt: string, tools?: Tool[]): AsyncGenerator<string> {
        const params: any = {
            model: this.modelName,
            messages: [{ role: 'user', content: prompt }],
            stream: true,
        };

        if (tools && tools.length > 0) {
            params.tools = tools.map(tool => ({
                type: 'function',
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: zodToJsonSchema(tool.schema as any),
                },
            }));
        }

        const stream = await this.client.chat.completions.create(params) as any;
        for await (const chunk of stream) {
            const content = chunk.choices?.[0]?.delta?.content || '';
            if (content) yield content;
        }
    }

    async listModels(): Promise<string[]> {
        // Placeholder for fetching models from Antigravity API
        // if (this.oauthToken) { ... fetch from api ... }
        return ['ag-model-1', 'ag-model-2-beta', 'ag-r1-reasoning'];
    }
}
