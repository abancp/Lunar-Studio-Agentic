import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProvider, Tool } from './types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

export class GoogleProvider implements LLMProvider {
    private genAI: GoogleGenerativeAI;
    private model: any;
    private apiKey: string;

    constructor(apiKey: string, modelName: string = 'gemini-1.5-flash') {
        this.apiKey = apiKey;
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: modelName });
    }

    private formatTools(tools: Tool[]): any[] {
        return [{
            functionDeclarations: tools.map(t => {
                const schema = zodToJsonSchema(t.schema as any) as any;
                delete schema['$schema'];
                return {
                    name: t.name,
                    description: t.description,
                    parameters: schema,
                };
            })
        }];
    }

    async generate(prompt: string, tools?: Tool[]): Promise<string> {
        const chat = this.model.startChat({
            history: [],
            tools: tools ? this.formatTools(tools) : undefined,
        });

        const result = await chat.sendMessage(prompt);
        const response = result.response;
        return response.text();
    }

    async *stream(prompt: string, tools?: Tool[]): AsyncGenerator<string> {
        const chat = this.model.startChat({
            history: [],
            tools: tools ? this.formatTools(tools) : undefined,
        });

        const result = await chat.sendMessageStream(prompt);
        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            yield chunkText;
        }
    }

    async listModels(): Promise<string[]> {
        try {
            // Using REST API to list models since SDK access is limited/complex for this specific function on the instance
            // We need the API key which is private, but we can access it via the instance if we expoed it, 
            // but simpler to asking config or just storing it.
            // Wait, I don't have access to apiKey here easily unless I stored it.
            // I should store apiKey in the class.
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`);
            if (!response.ok) {
                return ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro']; // Fallback
            }
            const data = await response.json() as any;
            return (data.models || []).map((m: any) => m.name.replace('models/', ''));
        } catch (e) {
            return ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'];
        }
    }
}
