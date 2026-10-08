import { useState, useEffect, useRef, useCallback } from 'react';
import type { FileMessage } from '../components/MediaMessage';

// ── Types ──

export type NavPage = 'chat' | 'memory' | 'tools' | 'logs' | 'apps' | 'settings' | 'context';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    toolCalls?: ToolCallInfo[];
    fileAttachment?: FileMessage;
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

export interface LogEntry {
    level: string;
    message: string;
    timestamp: string;
    [key: string]: any;
}

export interface MemoryEntry {
    id: string;
    content: string;
    personId: string;
    createdAt: number;
    tags?: string[];
}

export interface ToolDetail {
    name: string;
    description: string;
    schema: any;
}

export interface AgentConfig {
    provider: string;
    apiKeys: Record<string, boolean>;
    models: Record<string, string>;
    workspace: string;
    whatsapp: { enabled: boolean; allowedNumbers?: string[] };
    people: any[];
}

// ── Hook ──

export function useWebSocket() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [memories, setMemories] = useState<MemoryEntry[]>([]);
    const [toolDetails, setToolDetails] = useState<ToolDetail[]>([]);
    const [agentConfig, setAgentConfig] = useState<AgentConfig | null>(null);
    const [sessions, setSessions] = useState<string[]>([]);
    const [history, setHistory] = useState<{ chatId: string; messages: any[]; tools?: ToolDetail[] } | null>(null);
    const [receivedFiles, setReceivedFiles] = useState<FileMessage[]>([]);
    const [notifications, setNotifications] = useState<{ id: string; title: string; body: string; notifyType: string }[]>([]);


    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const reconnectAttempt = useRef(0);
    const pendingToolCalls = useRef<Map<string, number>>(new Map());

    const getWsUrl = () => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
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
            ws.send(JSON.stringify({ type: 'get_status' }));
        };

        ws.onclose = () => {
            setIsConnected(false);
            wsRef.current = null;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempt.current), 10000);
            reconnectAttempt.current++;
            reconnectTimer.current = setTimeout(connect, delay);
        };

        ws.onerror = () => { };

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
                    const toolCalls: ToolCallInfo[] = [];
                    pendingToolCalls.current.forEach((_idx, name) => {
                        toolCalls.push({ name, args: '', status: 'done' });
                    });

                    setMessages(prev => {
                        const last = prev[prev.length - 1];
                        if (last && last.role === 'assistant' && last.content === '' && last.toolCalls && last.toolCalls.length > 0) {
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
                        if (last && last.role === 'assistant' && last.toolCalls) {
                            const updated = [...prev];
                            updated[prev.length - 1] = {
                                ...last,
                                toolCalls: [...(last.toolCalls || []), toolInfo],
                            };
                            return updated;
                        }
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

                case 'file': {
                    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const fileMsg: FileMessage = {
                        id: `file-${Date.now()}`,
                        fileName: msg.fileName,
                        mimeType: msg.mimeType,
                        data: msg.data,
                        caption: msg.caption,
                        forceDownload: msg.forceDownload,
                        sizeBytes: msg.sizeBytes,
                        timestamp: now,
                    };
                    setReceivedFiles(prev => [...prev, fileMsg]);
                    setMessages(prev => [...prev, {
                        id: fileMsg.id,
                        role: 'assistant' as const,
                        content: '',
                        timestamp: now,
                        fileAttachment: fileMsg,
                    }]);
                    break;
                }

                case 'notify': {
                    const notifId = `notif-${Date.now()}`;
                    setNotifications(prev => [...prev, {
                        id: notifId,
                        title: msg.title,
                        body: msg.body,
                        notifyType: msg.notifyType || 'info',
                    }]);
                    setTimeout(() => {
                        setNotifications(prev => prev.filter(n => n.id !== notifId));
                    }, 5000);
                    break;
                }

                case 'upload_ok':
                    setMessages(prev => [...prev, {
                        id: `upload-${Date.now()}`,
                        role: 'assistant' as const,
                        content: `📎 **${msg.fileName}** uploaded (id: \`${msg.fileId}\`). You can now ask me about this file.`,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    }]);
                    break;

                case 'welcome':
                    break;

                // ── New data types ──

                case 'logs':
                    setLogs(msg.lines || []);
                    break;

                case 'log_line':
                    setLogs(prev => [...prev, msg.line]);
                    break;

                case 'memories':
                    setMemories(msg.memories || []);
                    break;

                case 'tools_list':
                    setToolDetails(msg.tools || []);
                    break;

                case 'config':
                    setAgentConfig(msg as AgentConfig);
                    break;

                case 'config_updated':
                    // Config was updated — will get a fresh 'config' message right after
                    break;

                case 'sessions':
                    setSessions(msg.sessions || []);
                    break;

                case 'history':
                    setHistory({ chatId: msg.chatId, messages: msg.messages, tools: msg.tools });
                    break;

                case 'history_cleared':
                    if (history && history.chatId === msg.chatId) {
                        setHistory({ ...history, messages: [] });
                    }
                    break;

                case 'history_popped':
                    if (history && history.chatId === msg.chatId) {
                        // refreshing history is best, but we can optimistically pop
                        setHistory(prev => prev ? { ...prev, messages: prev.messages.slice(0, -1) } : null);
                    }
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

    const uploadFile = useCallback((file: File): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                reject(new Error('Not connected'));
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1];
                wsRef.current!.send(JSON.stringify({
                    type: 'upload_file',
                    fileName: file.name,
                    mimeType: file.type || 'application/octet-stream',
                    data: base64,
                }));
                resolve();
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }, []);

    const dismissNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const requestLogs = useCallback(() => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        wsRef.current.send(JSON.stringify({ type: 'get_logs' }));
    }, []);

    const requestMemories = useCallback(() => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        wsRef.current.send(JSON.stringify({ type: 'get_memories' }));
    }, []);

    const requestTools = useCallback(() => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        wsRef.current.send(JSON.stringify({ type: 'get_tools' }));
    }, []);

    const requestConfig = useCallback(() => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        wsRef.current.send(JSON.stringify({ type: 'get_config' }));
    }, []);

    const updateConfig = useCallback((key: string, value: any) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        wsRef.current.send(JSON.stringify({ type: 'update_config', config: { key, value } }));
    }, []);

    const requestSessions = useCallback(() => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        wsRef.current.send(JSON.stringify({ type: 'get_sessions' }));
    }, []);

    const requestHistory = useCallback((chatId: string) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        wsRef.current.send(JSON.stringify({ type: 'get_history', chatId }));
    }, []);

    const clearHistory = useCallback((chatId: string) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        wsRef.current.send(JSON.stringify({ type: 'clear_history', chatId }));
    }, []);

    const popHistory = useCallback((chatId: string) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        wsRef.current.send(JSON.stringify({ type: 'pop_history', chatId }));
    }, []);

    return {
        messages,
        isConnected,
        isGenerating,
        agentStatus,
        logs,
        memories,
        toolDetails,
        agentConfig,
        sendMessage,
        stopGenerating,
        uploadFile,
        receivedFiles,
        notifications,
        dismissNotification,
        requestLogs,
        requestMemories,
        requestTools,
        requestConfig,
        updateConfig,
        sessions,
        history,
        requestSessions,
        requestHistory,
        clearHistory,
        popHistory,
    };
}
