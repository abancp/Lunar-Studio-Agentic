import { z } from 'zod';

export interface Tool {
    name: string;
    description: string;
    schema: z.ZodType<any>;
    execute: (args: any) => Promise<any>;
}

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}

export interface Message {
    role: MessageRole;
    content: string | null;
    tool_calls?: ToolCall[];
    tool_call_id?: string; // For tool role messages
    name?: string; // For tool role messages
}

export interface LLMProvider {
    generate(messages: Message[], tools?: Tool[]): Promise<Message>;
    stream(messages: Message[], tools?: Tool[]): AsyncGenerator<string>;
    listModels?(): Promise<string[]>;
}
