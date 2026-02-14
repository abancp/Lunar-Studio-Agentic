import { Message, MessageRole } from '../../llm/types.js';

export class HistoryManager {
    private history: Message[] = [];
    private maxHistory: number = 50; // Keep last 50 messages to avoid context overflow (naive approach)

    constructor(initialSystemPrompt?: string) {
        if (initialSystemPrompt) {
            this.addSystemMessage(initialSystemPrompt);
        }
    }

    getMessages(): Message[] {
        return this.history;
    }

    addMessage(role: MessageRole, content: string | null, toolCalls?: any[], toolCallId?: string, name?: string) {
        const message: Message = {
            role,
            content,
        };

        if (toolCalls) {
            message.tool_calls = toolCalls;
        }

        if (toolCallId) {
            message.tool_call_id = toolCallId;
        }

        if (name) {
            message.name = name;
        }

        this.history.push(message);

        // Prune if too long, keeping system prompt at index 0 if valid
        if (this.history.length > this.maxHistory) {
            const system = this.history[0]?.role === 'system' ? this.history[0] : null;
            this.history = this.history.slice(this.history.length - this.maxHistory);
            if (system && this.history[0] !== system) {
                this.history.unshift(system);
            }
        }
    }

    addSystemMessage(content: string) {
        // If first message is system, replace it, otherwise unshift
        if (this.history.length > 0 && this.history[0].role === 'system') {
            this.history[0].content = content;
        } else {
            this.history.unshift({ role: 'system', content });
        }
    }

    addUserMessage(content: string) {
        this.addMessage('user', content);
    }

    addAssistantMessage(content: string | null, toolCalls?: any[]) {
        this.addMessage('assistant', content, toolCalls);
    }

    addToolResult(toolCallId: string, toolName: string, result: string) {
        this.addMessage('tool', result, undefined, toolCallId, toolName);
    }

    clear() {
        // preserve system prompt if exists
        const system = this.history.length > 0 && this.history[0].role === 'system' ? this.history[0] : null;
        this.history = [];
        if (system) {
            this.history.push(system);
        }
    }
}
