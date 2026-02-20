import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProvider, Tool, Message, MessageRole } from './types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

export class GoogleProvider implements LLMProvider {
    private genAI: GoogleGenerativeAI;
    private model: any;
    private apiKey: string;

    constructor(apiKey: string, modelName: string = 'gemini-1.5-flash') {
        this.apiKey = apiKey;
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: modelName,
        }, {
            timeout: 180000
        });
    }

    private cleanSchema(schema: any): any {
        if (!schema || typeof schema !== 'object') return schema;

        if (Array.isArray(schema)) {
            return schema.map(item => this.cleanSchema(item));
        }

        const newSchema = { ...schema };
        delete newSchema['$schema'];
        delete newSchema['additionalProperties'];

        for (const key in newSchema) {
            newSchema[key] = this.cleanSchema(newSchema[key]);
        }

        return newSchema;
    }

    private formatTools(tools: Tool[]): any[] {
        return [{
            functionDeclarations: tools.map(t => {
                const schema = zodToJsonSchema(t.schema as any) as any;
                return {
                    name: t.name,
                    description: t.description,
                    parameters: this.cleanSchema(schema),
                };
            })
        }];
    }

    private mapMessagesToGemini(messages: Message[]): any[] {
        return messages.map(m => {
            let role = 'user';
            if (m.role === 'assistant') role = 'model';
            else if (m.role === 'tool') role = 'function';
            else if (m.role === 'system') role = 'user'; // Gemini doesn't have strict system role in chat history often, or uses it differently. For now map to user or handle separately? 
            // Gemini 1.5 supports system instruction. We should probably extract system prompt separately if possible or just prepend.
            // For now, let's map system to user for simplicity or just handle history correctly. 
            // Actually, `startChat` takes `history`.

            // Special handling for tool results in Gemini
            if (m.role === 'tool') {
                return {
                    role: 'function',
                    parts: [{
                        functionResponse: {
                            name: m.name,
                            response: { name: m.name, content: m.content } // expecting JSON or string? Gemini expects object usually.
                        }
                    }]
                };
            }

            // Normal text
            const parts: any[] = [];
            if (m.content) parts.push({ text: m.content });

            if (m.tool_calls) {
                m.tool_calls.forEach(tc => {
                    parts.push({
                        functionCall: {
                            name: tc.function.name,
                            args: JSON.parse(tc.function.arguments)
                        }
                    });
                });
            }

            return { role, parts };
        });
    }

    async generate(messages: Message[], tools?: Tool[]): Promise<Message> {
        // Extract system prompt if present to pass as systemInstruction?
        // simple approach: just pass all as history, but Gemini requires alternating user/model.
        // We will assume messages is the full history.
        // But `startChat` expects history to be previous messages. 
        // And the last message is the new prompt? 
        // No, startChat takes history, then we send message.

        // Let's split: history = all but last. last = prompt.
        // Error handling if empty.
        if (messages.length === 0) return { role: 'assistant', content: "No input." };

        const lastMsg = messages[messages.length - 1];
        if (!lastMsg) return { role: 'assistant', content: "No input." };

        const historyMsgs = messages.slice(0, messages.length - 1);

        const history = this.mapMessagesToGemini(historyMsgs);

        // System prompt: if first message is system, we can pass it as systemInstruction if we create model with it
        // OR just prepend to history?
        // For now, let's just stick to chat history.

        const chat = this.model.startChat({
            history: history,
            tools: tools ? this.formatTools(tools) : undefined,
        });

        // Send the last message
        const lastPart = lastMsg.content || ""; // what if it is just tool result?
        // If last message is user text:
        let result;
        if (lastMsg.role === 'user') {
            result = await chat.sendMessage(lastMsg.content || "");
        } else if (lastMsg.role === 'tool') {
            // If last was tool, we are sending tool result.
            // But mapMessages handles tool role? 
            // Ideally we shouldn't be calling generate with last message as tool result directly unless we are resuming?
            // Actually, the standard flow is: User -> Assistant (with tool calls) -> Tool (result) -> Assistant (final)
            // So if last is Tool, we need to send it to get the next Assistant response.
            const toolPart = {
                functionResponse: {
                    name: lastMsg.name,
                    response: { result: lastMsg.content }
                }
            };
            result = await chat.sendMessage([toolPart]);
        } else {
            // fallback
            result = await chat.sendMessage(lastMsg.content || "...");
        }

        const response = result.response;
        const text = response.text(); // might be empty if tool call

        const functionCalls = response.functionCalls();
        const toolCalls: any[] = [];

        if (functionCalls && functionCalls.length > 0) {
            functionCalls.forEach((fc: any) => {
                toolCalls.push({
                    id: 'call_' + Math.random().toString(36).substr(2, 9), // Gemini doesn't give IDs often?
                    type: 'function',
                    function: {
                        name: fc.name,
                        arguments: JSON.stringify(fc.args)
                    }
                });
            });
        }

        return {
            role: 'assistant',
            content: text,
            tool_calls: toolCalls.length > 0 ? toolCalls : undefined
        };
    }

    async *stream(messages: Message[], tools?: Tool[]): AsyncGenerator<string> {
        if (messages.length === 0) return;

        const lastMsg = messages[messages.length - 1];
        if (!lastMsg) return;

        const historyMsgs = messages.slice(0, messages.length - 1);
        const history = this.mapMessagesToGemini(historyMsgs);

        const chat = this.model.startChat({
            history: history,
            tools: tools ? this.formatTools(tools) : undefined,
        });

        let result;
        if (lastMsg.role === 'user') {
            result = await chat.sendMessageStream(lastMsg.content || "");
        } else if (lastMsg.role === 'tool') {
            const toolPart = {
                functionResponse: {
                    name: lastMsg.name,
                    response: { result: lastMsg.content }
                }
            };
            result = await chat.sendMessageStream([toolPart]);
        } else {
            result = await chat.sendMessageStream(lastMsg.content || "...");
        }

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
