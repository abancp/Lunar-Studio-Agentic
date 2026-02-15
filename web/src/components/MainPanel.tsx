import {
    Bot,
    User,
    Wrench,
    CheckCircle,
    Copy,
    ThumbsUp,
    RefreshCw,
    Sparkles,
    ArrowDown,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface ToolCall {
    name: string;
    args: string;
    result: string;
}

interface Message {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    toolCalls?: ToolCall[];
}

const mockMessages: Message[] = [
    {
        id: 1,
        role: 'user',
        content: 'What\'s the weather like in San Francisco?',
        timestamp: '6:42 PM',
    },
    {
        id: 2,
        role: 'assistant',
        content:
            'Let me check the weather in San Francisco for you.',
        timestamp: '6:42 PM',
        toolCalls: [
            {
                name: 'weather',
                args: '{ "location": "San Francisco, CA" }',
                result: 'The weather in San Francisco is sunny and 75°F.',
            },
        ],
    },
    {
        id: 3,
        role: 'assistant',
        content:
            'The weather in **San Francisco, CA** is currently **sunny** with a temperature of **75°F** (24°C). Perfect day to be outside! ☀️\n\nWould you like me to check anything else?',
        timestamp: '6:42 PM',
    },
    {
        id: 4,
        role: 'user',
        content: 'Can you calculate 234 * 567 + 89?',
        timestamp: '6:43 PM',
    },
    {
        id: 5,
        role: 'assistant',
        content: 'Sure! Let me compute that for you.',
        timestamp: '6:43 PM',
        toolCalls: [
            {
                name: 'calculator',
                args: '{ "expression": "234 * 567 + 89" }',
                result: '132767',
            },
        ],
    },
    {
        id: 6,
        role: 'assistant',
        content:
            'The result of **234 × 567 + 89** is **132,767**.\n\nHere\'s the breakdown:\n- 234 × 567 = 132,678\n- 132,678 + 89 = **132,767**',
        timestamp: '6:43 PM',
    },
    {
        id: 7,
        role: 'user',
        content: 'Show me the files in my workspace.',
        timestamp: '6:45 PM',
    },
    {
        id: 8,
        role: 'assistant',
        content: 'I\'ll look into your workspace files right away.',
        timestamp: '6:45 PM',
        toolCalls: [
            {
                name: 'workspace',
                args: '{ "action": "list", "path": "./" }',
                result:
                    'src/\n  index.ts\n  memory.ts\n  log.ts\ntools/\n  index.ts\n  workspace.ts\nllm/\n  google.ts\n  openai.ts\n  groq.ts',
            },
        ],
    },
    {
        id: 9,
        role: 'assistant',
        content:
            'Here\'s an overview of your **Lunar Studio** workspace:\n\n📁 **src/** — Core agent logic\n- `index.ts` — Daemon entry point\n- `memory.ts` — Memory system\n- `log.ts` — Logging\n\n🔧 **tools/** — Agent tools\n- `index.ts` — Tool registry\n- `workspace.ts` — File operations\n\n🤖 **llm/** — LLM Providers\n- `google.ts` · `openai.ts` · `groq.ts`\n\nWant me to open or modify any files?',
        timestamp: '6:45 PM',
    },
];

function ToolCallCard({ tool }: { tool: ToolCall }) {
    const [expanded, setExpanded] = useState(false);
    return (
        <div className="my-3 rounded-xl border border-border-default bg-bg-tertiary/40 overflow-hidden animate-fade-in">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-hover/50 transition-colors cursor-pointer"
            >
                <div className="w-6 h-6 rounded-md bg-accent-primary/15 flex items-center justify-center">
                    <Wrench size={12} className="text-accent-primary-light" />
                </div>
                <span className="text-xs font-medium text-accent-primary-light">
                    {tool.name}
                </span>
                <span className="text-[10px] text-text-muted font-mono ml-1 truncate">
                    ({tool.args})
                </span>
                <div className="ml-auto flex items-center gap-1.5 shrink-0">
                    <CheckCircle size={12} className="text-success" />
                    <span className="text-[10px] text-success font-medium">Done</span>
                </div>
            </button>
            {expanded && (
                <div className="px-4 pb-3 border-t border-border-default">
                    <pre className="text-[11px] font-mono text-text-secondary mt-3 p-3.5 rounded-lg bg-bg-primary/60 overflow-x-auto">
                        {tool.result}
                    </pre>
                </div>
            )}
        </div>
    );
}

function MessageBubble({ message }: { message: Message }) {
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
                <div
                    className={`px-5 py-3.5 rounded-2xl text-sm leading-relaxed ${isUser
                            ? 'bg-accent-primary/12 border border-accent-primary/15 text-text-primary rounded-tr-sm'
                            : 'bg-bg-tertiary/60 border border-border-default text-text-primary rounded-tl-sm'
                        }`}
                >
                    {/* Simple markdown-like rendering */}
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

                {/* Tool Calls */}
                {message.toolCalls?.map((tool, i) => (
                    <ToolCallCard key={i} tool={tool} />
                ))}

                {/* Meta */}
                <div
                    className={`flex items-center gap-2 mt-2 px-2 ${isUser ? 'flex-row-reverse' : ''
                        }`}
                >
                    <span className="text-[10px] text-text-muted font-mono">
                        {message.timestamp}
                    </span>
                    {!isUser && (
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

export default function MainPanel() {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showScrollBtn, setShowScrollBtn] = useState(false);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTop = el.scrollHeight;

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
                            Model: gemini-2.0-flash · Tools: 4 active
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-muted font-mono px-2.5 py-1.5 rounded-lg bg-bg-tertiary/50 border border-border-default">
                        9 messages
                    </span>
                </div>
            </div>

            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-10 py-8 space-y-7 scroll-smooth"
            >
                {/* Welcome */}
                <div className="flex flex-col items-center justify-center py-10 animate-fade-in">
                    <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 border border-border-default flex items-center justify-center mb-5 glow-accent" style={{ width: '72px', height: '72px' }}>
                        <Bot size={30} className="text-accent-primary-light" />
                    </div>
                    <h3 className="text-lg font-semibold text-gradient mb-2">
                        Lunar Studio Agent
                    </h3>
                    <p className="text-sm text-text-muted text-center max-w-md">
                        Your AI assistant with tools for calculation, weather, workspace
                        management, and more.
                    </p>
                </div>

                {/* Messages */}
                {mockMessages.map((msg) => (
                    <div key={msg.id} className="group">
                        <MessageBubble message={msg} />
                    </div>
                ))}
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
