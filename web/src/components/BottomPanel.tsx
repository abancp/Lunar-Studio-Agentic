import { useState } from 'react';
import {
    Send,
    Paperclip,
    Mic,
    Command,
    CornerDownLeft,
    Sparkles,
    StopCircle,
} from 'lucide-react';
import type { AgentStatus } from '../hooks/useWebSocket';

interface BottomPanelProps {
    onSend: (message: string) => void;
    onStop: () => void;
    isGenerating: boolean;
    isConnected: boolean;
    agentStatus: AgentStatus | null;
}

export default function BottomPanel({ onSend, onStop, isGenerating, isConnected, agentStatus }: BottomPanelProps) {
    const [input, setInput] = useState('');

    const handleSend = () => {
        if (!input.trim() || !isConnected) return;
        onSend(input.trim());
        setInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const model = agentStatus?.model || '—';
    const toolCount = agentStatus?.tools?.length || 0;

    return (
        <div className="glass-panel-solid rounded-xl px-6 py-5 shrink-0">
            {/* Input Row */}
            <div className="flex items-end gap-4">
                {/* Attachment */}
                <button className="p-3 rounded-xl text-text-muted hover:text-text-secondary hover:bg-bg-hover transition-colors cursor-pointer shrink-0 mb-0.5">
                    <Paperclip size={18} />
                </button>

                {/* Input Container */}
                <div className="flex-1 relative">
                    <div className="flex items-end rounded-2xl bg-bg-tertiary/60 border border-border-default focus-within:border-accent-primary/30 focus-within:shadow-[0_0_0_1px_rgba(108,92,231,0.1)] transition-all">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={isConnected ? 'Message Lunar Studio...' : 'Connecting to agent...'}
                            disabled={!isConnected}
                            rows={1}
                            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none resize-none px-5 py-4 max-h-32 min-h-[52px] font-sans leading-relaxed disabled:opacity-50"
                            style={{
                                height: input ? 'auto' : '52px',
                            }}
                        />

                        {/* Inline Actions */}
                        <div className="flex items-center gap-1.5 pr-3 pb-3">
                            <button className="p-2 rounded-lg text-text-muted hover:text-text-secondary hover:bg-bg-hover/60 transition-colors cursor-pointer">
                                <Mic size={16} />
                            </button>

                            {isGenerating ? (
                                <button
                                    onClick={onStop}
                                    className="p-2.5 rounded-xl bg-danger/15 text-danger hover:bg-danger/25 transition-colors cursor-pointer"
                                >
                                    <StopCircle size={18} />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || !isConnected}
                                    className={`p-2.5 rounded-xl transition-all duration-200 cursor-pointer ${input.trim() && isConnected
                                            ? 'bg-accent-primary text-white shadow-lg shadow-accent-primary/20 hover:bg-accent-primary/90 scale-100'
                                            : 'bg-bg-hover text-text-muted scale-95'
                                        }`}
                                >
                                    <Send size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="flex items-center justify-between mt-4 px-2">
                {/* Left — Status */}
                <div className="flex items-center gap-3">
                    {isGenerating ? (
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span className="text-xs text-accent-primary-light font-medium">
                                Generating response...
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Sparkles size={12} className="text-text-muted" />
                            <span className="text-xs text-text-muted">
                                {model}
                            </span>
                            <span className="text-xs text-text-muted">·</span>
                            <span className="text-xs text-text-muted">
                                {toolCount} tools active
                            </span>
                        </div>
                    )}
                </div>

                {/* Right — Shortcuts */}
                <div className="flex items-center gap-4 text-text-muted">
                    <div className="flex items-center gap-1.5">
                        <kbd className="text-[10px] px-1.5 py-1 rounded border border-border-default bg-bg-tertiary/40 font-mono">
                            <CornerDownLeft size={9} className="inline" />
                        </kbd>
                        <span className="text-[10px]">Send</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <kbd className="text-[10px] px-1.5 py-1 rounded border border-border-default bg-bg-tertiary/40 font-mono">
                            Shift + <CornerDownLeft size={9} className="inline" />
                        </kbd>
                        <span className="text-[10px]">New line</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <kbd className="text-[10px] px-1.5 py-1 rounded border border-border-default bg-bg-tertiary/40 font-mono">
                            <Command size={9} className="inline" /> K
                        </kbd>
                        <span className="text-[10px]">Commands</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
