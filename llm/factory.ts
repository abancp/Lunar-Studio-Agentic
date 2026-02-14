import { LLMProvider } from './types.js';
import { OpenAIProvider } from './openai.js';
import { GoogleProvider } from './google.js';
import { AntigravityProvider } from './antigravity.js';

export function createLLM(provider: string, apiKey: string, model?: string): LLMProvider {
    switch (provider) {
        case 'openai':
            return new OpenAIProvider(apiKey, model);
        case 'gemini': // Keep backward compatibility just in case
        case 'google':
            return new GoogleProvider(apiKey, model);
        case 'antigravity':
            return new AntigravityProvider(apiKey, model);
        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }
}
