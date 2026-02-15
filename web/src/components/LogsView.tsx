import { useEffect, useRef } from 'react';
import { AlertTriangle, Info, Bug, AlertCircle, ChevronDown } from 'lucide-react';
import type { LogEntry } from '../hooks/useWebSocket';

interface LogsViewProps {
    logs: LogEntry[];
    onRequestLogs: () => void;
}

const LEVEL_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    error: { icon: AlertCircle, color: 'text-danger', bg: 'bg-danger/10' },
    warn: { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
    info: { icon: Info, color: 'text-accent-secondary', bg: 'bg-accent-secondary/10' },
    debug: { icon: Bug, color: 'text-text-muted', bg: 'bg-bg-tertiary/40' },
};

export default function LogsView({ logs, onRequestLogs }: LogsViewProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const autoScroll = useRef(true);

    useEffect(() => {
        onRequestLogs();
    }, [onRequestLogs]);

    useEffect(() => {
        if (autoScroll.current && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    const handleScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        autoScroll.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    };

    return (
        <main className="flex-1 flex flex-col min-h-0 min-w-0 glass-panel-solid rounded-xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border-default flex items-center justify-between bg-bg-secondary/50 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-accent-secondary/10 flex items-center justify-center">
                        <Bug size={14} className="text-accent-secondary" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-text-primary">Live Logs</h2>
                        <p className="text-[10px] text-text-muted">Real-time agent logs · {logs.length} entries</p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        autoScroll.current = true;
                        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-tertiary/50 border border-border-default text-text-muted hover:text-text-primary transition-colors cursor-pointer text-xs"
                >
                    <ChevronDown size={12} />
                    Scroll to bottom
                </button>
            </div>

            {/* Log Entries */}
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto font-mono text-xs scroll-smooth"
            >
                {logs.length === 0 && (
                    <div className="flex items-center justify-center h-full text-text-muted text-sm">
                        No logs yet. Waiting for agent activity...
                    </div>
                )}
                {logs.map((log, i) => {
                    const level = log.level || 'info';
                    const cfg = LEVEL_CONFIG[level] || LEVEL_CONFIG.info!;
                    const Icon = cfg.icon;
                    const ts = log.timestamp
                        ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        : '';

                    return (
                        <div
                            key={i}
                            className={`flex items-start gap-3 px-6 py-2 border-b border-border-default/30 hover:bg-bg-hover/30 transition-colors ${level === 'error' ? 'bg-danger/5' : ''
                                }`}
                        >
                            <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg}`}>
                                <Icon size={11} className={cfg.color} />
                            </div>
                            <span className="text-text-muted shrink-0 w-20">{ts}</span>
                            <span className={`shrink-0 w-12 uppercase font-semibold text-[10px] mt-0.5 ${cfg.color}`}>
                                {level}
                            </span>
                            <span className="text-text-secondary flex-1 break-all leading-relaxed">
                                {typeof log.message === 'string' ? log.message : JSON.stringify(log.message)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </main>
    );
}
