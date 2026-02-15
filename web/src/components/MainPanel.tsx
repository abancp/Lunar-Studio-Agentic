import {
    Bot,
    User,
    Wrench,
    CheckCircle,
    Loader2,
    Copy,
    ThumbsUp,
    RefreshCw,
    Sparkles,
    ArrowDown,
    ChevronDown,
    Layers,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { ChatMessage, ToolCallInfo, AgentStatus } from '../hooks/useWebSocket';

// ── Single tool row inside the stack ──

function ToolCallRow({ tool, isLast }: { tool: ToolCallInfo; isLast: boolean }) {
    const [expanded, setExpanded] = useState(false);
    const isRunning = tool.status === 'running';

    return (
        <>
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-bg-hover/50 transition-colors cursor-pointer"
            >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center ${isRunning ? 'bg-accent-secondary/15' : 'bg-success/15'
                    }`}>
                    {isRunning ? (
                        <Loader2 size={11} className="text-accent-secondary animate-spin" />
                    ) : (
                        <CheckCircle size={11} className="text-success" />
                    )}
                </div>
                <span className="text-xs font-medium text-accent-primary-light">
                    {tool.name}
                </span>
                {tool.args && (
                    <span className="text-[10px] text-text-muted font-mono ml-0.5 truncate flex-1 text-left">
                        {tool.args}
                    </span>
                )}
                <div className="ml-auto flex items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] font-medium ${isRunning ? 'text-accent-secondary' : 'text-success'}`}>
                        {isRunning ? 'Running' : 'Done'}
                    </span>
                    {tool.result && (
                        <ChevronDown size={10} className={`text-text-muted transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
                    )}
                </div>
            </button>
            {expanded && tool.result && (
                <div className="px-4 pb-2.5">
                    <pre className="text-[11px] font-mono text-text-secondary p-3 rounded-lg bg-bg-primary/60 overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {tool.result}
                    </pre>
                </div>
            )}
            {!isLast && <div className="h-px bg-border-default/60 mx-3" />}
        </>
    );
}

// ── Stacked tool calls container ──

function ToolCallStack({ tools }: { tools: ToolCallInfo[] }) {
    const runningCount = tools.filter(t => t.status === 'running').length;
    const doneCount = tools.filter(t => t.status === 'done').length;

    return (
        <div className="my-3 rounded-xl border border-border-default bg-bg-tertiary/40 overflow-hidden animate-fade-in">
            {/* Stack header */}
            <div className="flex items-center gap-2.5 px-4 py-2 bg-bg-tertiary/60 border-b border-border-default/60">
                <div className="w-5 h-5 rounded-md bg-accent-primary/15 flex items-center justify-center">
                    {tools.length > 1 ? (
                        <Layers size={11} className="text-accent-primary-light" />
                    ) : (
                        <Wrench size={11} className="text-accent-primary-light" />
                    )}
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    {tools.length > 1 ? `${tools.length} Tool Calls` : 'Tool Call'}
                </span>
                <div className="ml-auto flex items-center gap-2">
                    {runningCount > 0 && (
                        <span className="text-[10px] text-accent-secondary font-medium flex items-center gap-1">
                            <Loader2 size={10} className="animate-spin" />
                            {runningCount} running
                        </span>
                    )}
                    {doneCount > 0 && (
                        <span className="text-[10px] text-success font-medium flex items-center gap-1">
                            <CheckCircle size={10} />
                            {doneCount} done
                        </span>
                    )}
                </div>
            </div>

            {/* Tool rows */}
            {tools.map((tool, i) => (
                <ToolCallRow key={i} tool={tool} isLast={i === tools.length - 1} />
            ))}
        </div>
    );
}

// ── Message bubble ──

function MessageBubble({ message }: { message: ChatMessage }) {
    const isUser = message.role === 'user';

    return (
        <div
            className={`flex gap-4 animate-fade-in ${isUser ? 'flex-row-reverse' : ''
                }`}
        >
            {/* Avatar */}
            <div
                className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center mt-1 ${isUser
                        ? 'bg-accent-primary/15 border border-accent-primary/20'
                        : 'bg-accent-secondary/10 border border-accent-secondary/15'
                    }`}
            >
                {isUser ? (
                    <User size={15} className="text-accent-primary-light" />
                ) : (
                    <Bot size={15} className="text-accent-secondary" />
                )}
            </div>

            {/* Content */}
            <div className={`flex flex-col max-w-[72%] ${isUser ? 'items-end' : ''}`}>
                {message.content && (
                    <div
                        className={`px-5 py-3.5 rounded-2xl text-sm leading-relaxed ${isUser
                                ? 'bg-accent-primary/12 border border-accent-primary/15 text-text-primary rounded-tr-sm'
                                : 'bg-bg-tertiary/60 border border-border-default text-text-primary rounded-tl-sm'
                            }`}
                    >
                        {message.content.split('\n').map((line, i) => (
                            <p key={i} className={i > 0 ? 'mt-2' : ''}>
                                {line.split(/(\*\*[^*]+\*\*)/).map((part, j) => {
                                    if (part.startsWith('**') && part.endsWith('**')) {
                                        return (
                                            <strong key={j} className="font-semibold text-text-primary">
                                                {part.slice(2, -2)}
                                            </strong>
                                        );
                                    }
                                    if (part.startsWith('`') && part.endsWith('`')) {
                                        return (
                                            <code
                                                key={j}
                                                className="px-1.5 py-0.5 rounded bg-bg-primary/60 font-mono text-xs text-accent-primary-light"
                                            >
                                                {part.slice(1, -1)}
                                            </code>
                                        );
                                    }
                                    return <span key={j}>{part}</span>;
                                })}
                            </p>
                        ))}
                    </div>
                )}

                {/* Tool Calls — Stacked */}
                {message.toolCalls && message.toolCalls.length > 0 && (
                    <ToolCallStack tools={message.toolCalls} />
                )}

                {/* Meta */}
                <div
                    className={`flex items-center gap-2 mt-2 px-2 ${isUser ? 'flex-row-reverse' : ''
                        }`}
                >
                    <span className="text-[10px] text-text-muted font-mono">
                        {message.timestamp}
                    </span>
                    {!isUser && message.content && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-1.5 rounded hover:bg-bg-hover transition-colors cursor-pointer">
                                <Copy size={10} className="text-text-muted" />
                            </button>
                            <button className="p-1.5 rounded hover:bg-bg-hover transition-colors cursor-pointer">
                                <ThumbsUp size={10} className="text-text-muted" />
                            </button>
                            <button className="p-1.5 rounded hover:bg-bg-hover transition-colors cursor-pointer">
                                <RefreshCw size={10} className="text-text-muted" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Main Panel ──

interface MainPanelProps {
    messages: ChatMessage[];
    isGenerating: boolean;
    agentStatus: AgentStatus | null;
}

export default function MainPanel({ messages, isGenerating, agentStatus }: MainPanelProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showScrollBtn, setShowScrollBtn] = useState(false);

    // Auto-scroll on new messages
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const handleScroll = () => {
            const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
            setShowScrollBtn(!atBottom);
        };
        el.addEventListener('scroll', handleScroll);
        return () => el.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToBottom = () => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    };

    const model = agentStatus?.model || '—';
    const toolCount = agentStatus?.tools?.length || 0;

    return (
        <main className="flex-1 flex flex-col min-h-0 min-w-0 relative glass-panel-solid rounded-xl overflow-hidden">
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-border-default flex items-center justify-between bg-bg-secondary/50 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-accent-primary/10 flex items-center justify-center">
                        <Sparkles size={14} className="text-accent-primary-light" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-text-primary">New Conversation</h2>
                        <p className="text-[10px] text-text-muted">
                            Model: {model} · Tools: {toolCount} active
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-muted font-mono px-2.5 py-1.5 rounded-lg bg-bg-tertiary/50 border border-border-default">
                        {messages.length} messages
                    </span>
                </div>
            </div>

            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-10 py-8 space-y-7 scroll-smooth"
            >
                {/* Welcome (show only when no messages) */}
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 animate-fade-in">
                        <div className="rounded-2xl bg-linear-to-br from-accent-primary/20 to-accent-secondary/20 border border-border-default flex items-center justify-center mb-5 glow-accent" style={{ width: '72px', height: '72px' }}>
                            <Bot size={30} className="text-accent-primary-light" />
                        </div>
                        <h3 className="text-lg font-semibold text-gradient mb-2">
                            Lunar Studio Agent
                        </h3>
                        <p className="text-sm text-text-muted text-center max-w-md">
                            Your AI assistant with tools for calculation, weather, workspace
                            management, and more. Start typing to begin.
                        </p>
                    </div>
                )}

                {/* Messages */}
                {messages.map((msg) => (
                    <div key={msg.id} className="group">
                        <MessageBubble message={msg} />
                    </div>
                ))}

                {/* Generating Indicator */}
                {isGenerating && (
                    <div className="flex gap-4 animate-fade-in">
                        <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center mt-1 bg-accent-secondary/10 border border-accent-secondary/15">
                            <Bot size={15} className="text-accent-secondary" />
                        </div>
                        <div className="px-5 py-3.5 rounded-2xl bg-bg-tertiary/60 border border-border-default rounded-tl-sm">
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Scroll to Bottom */}
            {showScrollBtn && (
                <button
                    onClick={scrollToBottom}
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 p-2.5 rounded-full bg-bg-elevated/90 border border-border-default shadow-lg hover:bg-bg-hover transition-colors cursor-pointer animate-fade-in z-10"
                >
                    <ArrowDown size={14} className="text-text-secondary" />
                </button>
            )}
        </main>
    );
}
