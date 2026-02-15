import { useState, useEffect, useRef, useCallback } from 'react';

// ── Types ──

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    toolCalls?: ToolCallInfo[];
}

export interface ToolCallInfo {
    name: string;
    args: string;
    result?: string;
    status: 'running' | 'done' | 'error';
}

export interface AgentStatus {
    agent: string;
    provider: string;
    model: string;
    tools: string[];
    whatsapp: string;
}

// ── Hook ──

export function useWebSocket() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const reconnectAttempt = useRef(0);
    const pendingToolCalls = useRef<Map<string, number>>(new Map()); // toolName -> messageIndex

    const getWsUrl = () => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // In dev mode (Vite port), connect to the daemon port
        const host = window.location.hostname;
        const port = window.location.port === '5174' || window.location.port === '5173'
            ? '3210'
            : window.location.port;
        return `${protocol}//${host}:${port}`;
    };

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        const url = getWsUrl();
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            setIsConnected(true);
            reconnectAttempt.current = 0;
            // Request status on connect
            ws.send(JSON.stringify({ type: 'get_status' }));
        };

        ws.onclose = () => {
            setIsConnected(false);
            wsRef.current = null;

            // Exponential backoff reconnect
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempt.current), 10000);
            reconnectAttempt.current++;
            reconnectTimer.current = setTimeout(connect, delay);
        };

        ws.onerror = () => {
            // Will trigger onclose
        };

        ws.onmessage = (event) => {
            let msg: any;
            try {
                msg = JSON.parse(event.data);
            } catch {
                return;
            }

            switch (msg.type) {
                case 'status':
                    setAgentStatus(msg as AgentStatus);
                    break;

                case 'text': {
                    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    // Merge pending tool calls into this message
                    const toolCalls: ToolCallInfo[] = [];
                    pendingToolCalls.current.forEach((_idx, name) => {
                        toolCalls.push({ name, args: '', status: 'done' });
                    });

                    setMessages(prev => {
                        // Check if last message is an assistant message being built
                        const last = prev[prev.length - 1];
                        if (last && last.role === 'assistant' && last.content === '' && last.toolCalls && last.toolCalls.length > 0) {
                            // This text comes after tool calls — create new message with the tool calls attached
                            const updated = [...prev];
                            updated[prev.length - 1] = {
                                ...last,
                                content: msg.content,
                                timestamp: now,
                            };
                            return updated;
                        }
                        return [...prev, {
                            id: `msg-${Date.now()}`,
                            role: 'assistant' as const,
                            content: msg.content,
                            timestamp: now,
                            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
                        }];
                    });
                    pendingToolCalls.current.clear();
                    break;
                }

                case 'tool_start': {
                    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const toolInfo: ToolCallInfo = {
                        name: msg.name,
                        args: msg.args,
                        status: 'running',
                    };

                    setMessages(prev => {
                        const last = prev[prev.length - 1];
                        // If last message is assistant with pending tool calls, append
                        if (last && last.role === 'assistant' && last.toolCalls) {
                            const updated = [...prev];
                            updated[prev.length - 1] = {
                                ...last,
                                toolCalls: [...(last.toolCalls || []), toolInfo],
                            };
                            return updated;
                        }
                        // Create a new assistant message with tool call
                        return [...prev, {
                            id: `msg-${Date.now()}`,
                            role: 'assistant' as const,
                            content: '',
                            timestamp: now,
                            toolCalls: [toolInfo],
                        }];
                    });
                    break;
                }

                case 'tool_result': {
                    setMessages(prev => {
                        const updated = [...prev];
                        // Find the last assistant message with this tool
                        for (let i = updated.length - 1; i >= 0; i--) {
                            const m = updated[i]!;
                            if (m.role === 'assistant' && m.toolCalls) {
                                const tc = m.toolCalls.find(t => t.name === msg.name && t.status === 'running');
                                if (tc) {
                                    tc.result = msg.result;
                                    tc.status = 'done';
                                    updated[i] = { ...m, toolCalls: [...m.toolCalls] };
                                    break;
                                }
                            }
                        }
                        return updated;
                    });
                    break;
                }

                case 'done':
                    setIsGenerating(false);
                    break;

                case 'error':
                    setIsGenerating(false);
                    setMessages(prev => [...prev, {
                        id: `err-${Date.now()}`,
                        role: 'assistant' as const,
                        content: `⚠️ Error: ${msg.message}`,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    }]);
                    break;

                case 'welcome':
                    // Connection established
                    break;
            }
        };
    }, []);

    useEffect(() => {
        connect();
        return () => {
            clearTimeout(reconnectTimer.current);
            wsRef.current?.close();
        };
    }, [connect]);

    const sendMessage = useCallback((text: string) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        if (!text.trim()) return;

        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Add user message locally
        setMessages(prev => [...prev, {
            id: `msg-${Date.now()}`,
            role: 'user' as const,
            content: text,
            timestamp: now,
        }]);

        setIsGenerating(true);
        wsRef.current.send(JSON.stringify({ type: 'chat', message: text }));
    }, []);

    const stopGenerating = useCallback(() => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        wsRef.current.send(JSON.stringify({ type: 'stop' }));
        setIsGenerating(false);
    }, []);

    return {
        messages,
        isConnected,
        isGenerating,
        agentStatus,
        sendMessage,
        stopGenerating,
    };
}
