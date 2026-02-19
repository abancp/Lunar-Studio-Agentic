
import { useEffect, useState } from 'react';
import { RefreshCw, Trash2, Undo2, MessageSquare, User, Bot, Wrench } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ContextViewProps {
    sessions: string[];
    history: { chatId: string; messages: any[] } | null;
    requestSessions: () => void;
    requestHistory: (chatId: string) => void;
    clearHistory: (chatId: string) => void;
    popHistory: (chatId: string) => void;
}

export default function ContextView({
    sessions,
    history,
    requestSessions,
    requestHistory,
    clearHistory,
    popHistory
}: ContextViewProps) {
    const [selectedSession, setSelectedSession] = useState<string | null>(null);

    useEffect(() => {
        requestSessions();
    }, [requestSessions]);

    useEffect(() => {
        if (selectedSession) {
            requestHistory(selectedSession);
        }
    }, [selectedSession, requestHistory]);

    return (
        <div className="flex flex-1 min-h-0 gap-2">
            {/* Sessions List */}
            <div className="w-64 glass-panel-solid rounded-xl flex flex-col overflow-hidden">
                <div className="p-4 border-b border-border-default flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-text-primary">Active Sessions</h2>
                    <button
                        onClick={() => requestSessions()}
                        className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-hover rounded-md transition-colors"
                        title="Refresh Sessions"
                    >
                        <RefreshCw size={14} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {sessions.length === 0 ? (
                        <p className="text-xs text-text-muted text-center py-4">No active sessions</p>
                    ) : (
                        sessions.map(session => (
                            <button
                                key={session}
                                onClick={() => setSelectedSession(session)}
                                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2
                                    ${selectedSession === session
                                        ? 'bg-accent-primary/10 text-accent-primary-light border border-accent-primary/20'
                                        : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary border border-transparent'}`}
                            >
                                <MessageSquare size={12} className="shrink-0 opacity-70" />
                                <span className="truncate">{session}</span>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* History View */}
            <div className="flex-1 glass-panel-solid rounded-xl flex flex-col overflow-hidden">
                {!selectedSession ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-text-muted">
                        <MessageSquare size={32} className="mb-2 opacity-20" />
                        <p className="text-sm">Select a session to view context</p>
                    </div>
                ) : (
                    <>
                        <div className="p-4 border-b border-border-default flex items-center justify-between bg-bg-secondary/30">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-text-primary">{selectedSession}</span>
                                <span className="text-xs text-text-muted px-2 py-0.5 rounded-full bg-bg-tertiary border border-border-default">
                                    {history?.messages.length || 0} messages
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => popHistory(selectedSession)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-tertiary border border-border-default text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors text-xs font-medium"
                                    title="Remove last message (Undo)"
                                >
                                    <Undo2 size={12} />
                                    Pop Last
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm('Are you sure you want to clear this context? This cannot be undone.')) {
                                            clearHistory(selectedSession);
                                        }
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-error/10 border border-error/20 text-error hover:bg-error/20 transition-colors text-xs font-medium"
                                    title="Clear entire history"
                                >
                                    <Trash2 size={12} />
                                    Clear Context
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-bg-primary/30">
                            {(!history || history.messages.length === 0) ? (
                                <p className="text-xs text-text-muted text-center py-10">Context is empty</p>
                            ) : (
                                history.messages.map((msg, idx) => (
                                    <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`p-1.5 rounded-full h-fit mt-1 shrink-0 
                                            ${msg.role === 'user' ? 'bg-accent-primary/20 text-accent-primary-light'
                                                : msg.role === 'assistant' ? 'bg-purple-500/20 text-purple-400'
                                                    : msg.role === 'system' ? 'bg-amber-500/20 text-amber-400'
                                                        : 'bg-gray-500/20 text-gray-400'}`}>
                                            {msg.role === 'user' ? <User size={12} /> : msg.role === 'assistant' ? <Bot size={12} /> : msg.role === 'system' ? <Wrench size={12} /> : <Wrench size={12} />}
                                        </div>
                                        <div className={`max-w-[80%] rounded-lg px-3 py-2 text-xs border
                                            ${msg.role === 'user' ? 'bg-accent-primary/10 border-accent-primary/20 text-text-primary'
                                                : msg.role === 'assistant' ? 'bg-bg-secondary border-border-default text-text-secondary'
                                                    : 'bg-bg-tertiary border-border-default text-text-muted font-mono whitespace-pre-wrap'}`}>

                                            {msg.role === 'system' ? (
                                                <div className="font-mono text-[10px] opacity-80 max-h-32 overflow-y-auto">
                                                    {msg.content}
                                                </div>
                                            ) : (
                                                <div className="prose prose-invert prose-xs max-w-none">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                        {msg.content || ''}
                                                    </ReactMarkdown>
                                                </div>
                                            )}

                                            {msg.tool_calls && (
                                                <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                                                    {msg.tool_calls.map((tc: any, i: number) => (
                                                        <div key={i} className="font-mono text-[10px] text-text-muted bg-black/20 rounded px-2 py-1">
                                                            🔧 {tc.function.name}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
