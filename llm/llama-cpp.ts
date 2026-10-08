import { LLMProvider, Tool, Message } from './types.js';

export class LlamaCppProvider implements LLMProvider {
    private modelPath: string;
    
    // Maintain a singleton model and context instance across generations
    // to avoid reloading the model which takes 5-10 seconds per request.
    private static llamaInstance: any = null;
    private static modelInstance: any = null;
    private static contextInstance: any = null;
    private static currentModelPath: string | null = null;

    constructor(apiKey?: string, modelPath?: string) {
        this.modelPath = modelPath || '';
    }

    private async init() {
        if (!this.modelPath) {
            throw new Error('Model path is missing for llama-cpp provider.');
        }

        // Dynamically import to avoid loading C++ bindings globally
        const { getLlama } = await import('node-llama-cpp');

        if (LlamaCppProvider.currentModelPath !== this.modelPath) {
            if (LlamaCppProvider.contextInstance) {
                await LlamaCppProvider.contextInstance.dispose();
            }
            if (LlamaCppProvider.modelInstance) {
                await LlamaCppProvider.modelInstance.dispose();
            }
            LlamaCppProvider.contextInstance = null;
            LlamaCppProvider.modelInstance = null;
        }

        if (!LlamaCppProvider.llamaInstance) {
            LlamaCppProvider.llamaInstance = await getLlama();
        }

        if (!LlamaCppProvider.modelInstance) {
            LlamaCppProvider.modelInstance = await LlamaCppProvider.llamaInstance.loadModel({
                modelPath: this.modelPath,
            });
            LlamaCppProvider.currentModelPath = this.modelPath;
        }

        if (!LlamaCppProvider.contextInstance) {
            LlamaCppProvider.contextInstance = await LlamaCppProvider.modelInstance.createContext();
        }
    }

    private mapToChatHistory(messages: Message[]) {
        const history: any[] = [];
        
        for (const msg of messages) {
            if (msg.role === 'system') {
                history.push({
                    type: 'system',
                    text: msg.content || ''
                });
            } else if (msg.role === 'assistant') {
                history.push({
                    type: 'model',
                    response: [msg.content || '']
                });
            } else if (msg.role === 'user') {
                history.push({
                    type: 'user',
                    text: msg.content || ''
                });
            } else {
                // If there are other roles like tools, fallback to user
                history.push({
                    type: 'user',
                    text: msg.content || ''
                });
            }
        }
        
        return history;
    }

    async generate(messages: Message[], tools?: Tool[]): Promise<Message> {
        await this.init();
        const { LlamaChatSession } = await import('node-llama-cpp');
        
        const session = new LlamaChatSession({
            contextSequence: LlamaCppProvider.contextInstance.getSequence()
        });
        
        let promptText = '';
        if (messages.length > 0) {
            // we extract the last message as prompt, rest as history
            const userMsg = messages[messages.length - 1];
            promptText = userMsg?.content || '';
            const previousHistory = messages.slice(0, messages.length - 1);
            session.setChatHistory(this.mapToChatHistory(previousHistory));
        }

        const answer = await session.prompt(promptText, {
            temperature: 0.7,
            maxTokens: LlamaCppProvider.contextInstance.contextSize
        });

        return {
            role: 'assistant',
            content: answer,
        };
    }

    async *stream(messages: Message[], tools?: Tool[]): AsyncGenerator<string> {
        await this.init();
        const { LlamaChatSession } = await import('node-llama-cpp');
        
        const session = new LlamaChatSession({
            contextSequence: LlamaCppProvider.contextInstance.getSequence()
        });
        
        let promptText = '';
        if (messages.length > 0) {
            const userMsg = messages[messages.length - 1];
            promptText = userMsg?.content || '';
            const previousHistory = messages.slice(0, messages.length - 1);
            session.setChatHistory(this.mapToChatHistory(previousHistory));
        }

        // We use a queue to map callback to async generator
        let resolveNext: (() => void) | null = null;
        let rejectNext: ((err: any) => void) | null = null;
        let chunkQueue: string[] = [];
        let done = false;

        const generationPromise = session.prompt(promptText, {
            temperature: 0.7,
            maxTokens: LlamaCppProvider.contextInstance.contextSize,
            onToken(tokens: number[]) {
                // node-llama-cpp returns an array of token numbers
                // We decode using the model
                const chunkStr = LlamaCppProvider.modelInstance.detokenize(tokens);
                chunkQueue.push(chunkStr);
                if (resolveNext) {
                    resolveNext();
                    resolveNext = null;
                    rejectNext = null;
                }
            }
        }).then(() => {
            done = true;
            if (resolveNext) {
                resolveNext();
                resolveNext = null;
            }
        }).catch(err => {
            if (rejectNext) {
                rejectNext(err);
                rejectNext = null;
            }
            throw err;
        });

        while (true) {
            if (chunkQueue.length > 0) {
                const chunk = chunkQueue.shift()!;
                yield chunk;
            } else if (done) {
                break;
            } else {
                await new Promise<void>((resolve, reject) => {
                    resolveNext = resolve;
                    rejectNext = reject;
                });
            }
        }
    }
}
