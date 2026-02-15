import { useEffect } from 'react';
import { Brain, Clock, User, Tag } from 'lucide-react';
import type { MemoryEntry } from '../hooks/useWebSocket';

interface MemoryViewProps {
    memories: MemoryEntry[];
    onRequestMemories: () => void;
}

export default function MemoryView({ memories, onRequestMemories }: MemoryViewProps) {
    useEffect(() => {
        onRequestMemories();
    }, [onRequestMemories]);

    const grouped = memories.reduce<Record<string, MemoryEntry[]>>((acc, m) => {
        const key = m.personId || 'unknown';
        if (!acc[key]) acc[key] = [];
        acc[key]!.push(m);
        return acc;
    }, {});

    return (
        <main className="flex-1 flex flex-col min-h-0 min-w-0 glass-panel-solid rounded-xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border-default flex items-center justify-between bg-bg-secondary/50 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-accent-primary/10 flex items-center justify-center">
                        <Brain size={14} className="text-accent-primary-light" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-text-primary">Memories</h2>
                        <p className="text-[10px] text-text-muted">{memories.length} stored memories</p>
                    </div>
                </div>
                <button
                    onClick={onRequestMemories}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-tertiary/50 border border-border-default text-text-muted hover:text-text-primary transition-colors cursor-pointer text-xs"
                >
                    Refresh
                </button>
            </div>

            {/* Memory List */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                {memories.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-text-muted">
                        <Brain size={40} className="opacity-20 mb-4" />
                        <p className="text-sm">No memories stored yet.</p>
                        <p className="text-xs mt-1">Memories are saved automatically from conversations.</p>
                    </div>
                )}

                {Object.entries(grouped).map(([personId, mems]) => (
                    <div key={personId}>
                        {/* Person Header */}
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-full bg-accent-primary/15 flex items-center justify-center">
                                <User size={12} className="text-accent-primary-light" />
                            </div>
                            <span className="text-xs font-semibold text-text-primary capitalize">{personId}</span>
                            <span className="text-[10px] text-text-muted">· {mems.length} memories</span>
                        </div>

                        {/* Memory Cards */}
                        <div className="space-y-2 ml-8">
                            {mems.map((mem) => (
                                <div
                                    key={mem.id}
                                    className="px-4 py-3 rounded-xl bg-bg-tertiary/40 border border-border-default hover:border-border-hover transition-colors group"
                                >
                                    <p className="text-sm text-text-primary leading-relaxed">
                                        {mem.content}
                                    </p>
                                    <div className="flex items-center gap-3 mt-2">
                                        <div className="flex items-center gap-1 text-text-muted">
                                            <Clock size={10} />
                                            <span className="text-[10px] font-mono">
                                                {new Date(mem.createdAt * 1000).toLocaleDateString()} {new Date(mem.createdAt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        {mem.tags && mem.tags.length > 0 && (
                                            <div className="flex items-center gap-1">
                                                <Tag size={9} className="text-text-muted" />
                                                {mem.tags.map((tag) => (
                                                    <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-primary/10 text-accent-primary-light">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </main>
    );
}
