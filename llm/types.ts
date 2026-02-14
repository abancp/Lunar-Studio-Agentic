import { z } from 'zod';

export interface Tool {
    name: string;
    description: string;
    schema: z.ZodType<any>;
    execute: (args: any) => Promise<any>;
}

export interface LLMProvider {
    generate(prompt: string, tools?: Tool[]): Promise<string>;
    stream(prompt: string, tools?: Tool[]): AsyncGenerator<string>;
    listModels?(): Promise<string[]>;
}
