import {
    Moon,
    Bell,
    Settings,
    Cpu,
    Zap,
    ChevronDown,
    Wifi,
    WifiOff,
    Menu,
} from 'lucide-react';
import type { AgentStatus } from '../hooks/useWebSocket';

interface TopPanelProps {
    isConnected: boolean;
    agentStatus: AgentStatus | null;
    onOpenSettings: () => void;
    onOpenSidebar: () => void;
}

export default function TopPanel({ isConnected, agentStatus, onOpenSettings, onOpenSidebar }: TopPanelProps) {
    const provider = agentStatus?.provider || '—';
    const model = agentStatus?.model || '—';

    return (
        <header className="h-14 md:h-16 glass-panel-solid rounded-xl flex items-center justify-between px-3 md:px-6 z-20 relative shrink-0">
            {/* Left — Hamburger (mobile) + Branding */}
            <div className="flex items-center gap-2 md:gap-3">
                {/* Hamburger — mobile only */}
                <button
                    onClick={onOpenSidebar}
                    className="md:hidden p-2 rounded-lg hover:bg-bg-hover transition-colors text-text-secondary hover:text-text-primary cursor-pointer"
                    aria-label="Open sidebar"
                >
                    <Menu size={18} />
                </button>

                <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-linear-to-br from-accent-primary to-accent-secondary flex items-center justify-center shadow-lg shrink-0">
                    <Moon size={15} className="text-white" />
                </div>
                <div className="flex flex-col leading-tight">
                    <span className="text-xs md:text-sm font-semibold tracking-wide text-gradient">
                        Lunar Studio
                    </span>
                    <span className="text-[9px] md:text-[10px] text-text-muted font-medium tracking-widest uppercase">
                        AI Agent
                    </span>
                </div>
            </div>

            {/* Center — Agent Status (hidden on mobile) */}
            <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-4">
                {/* Status Indicator */}
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-bg-tertiary/60 border border-border-default">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success animate-pulse-glow' : 'bg-danger'}`} />
                    <span className="text-xs text-text-secondary font-medium">
                        {isConnected ? 'Agent Online' : 'Disconnected'}
                    </span>
                </div>

                {/* Provider Badge */}
                <button
                    onClick={onOpenSettings}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-bg-tertiary/60 border border-border-default hover:border-border-hover transition-colors cursor-pointer group"
                >
                    <Cpu size={12} className="text-accent-primary-light" />
                    <span className="text-xs text-text-secondary font-medium group-hover:text-text-primary transition-colors capitalize">
                        {provider}
                    </span>
                    <ChevronDown size={10} className="text-text-muted" />
                </button>

                {/* Model */}
                <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-bg-tertiary/60 border border-border-default">
                    <Zap size={11} className="text-accent-secondary" />
                    <span className="text-xs text-text-secondary font-mono">
                        {model}
                    </span>
                </div>
            </div>

            {/* Right — Actions */}
            <div className="flex items-center gap-1 md:gap-2">
                {/* WiFi status — hidden on mobile */}
                <div className={`hidden md:flex items-center gap-1.5 mr-3 px-3 py-1.5 rounded-lg border border-border-default ${isConnected ? 'bg-bg-tertiary/40' : 'bg-danger/10'}`}>
                    {isConnected ? (
                        <Wifi size={11} className="text-success" />
                    ) : (
                        <WifiOff size={11} className="text-danger" />
                    )}
                    <span className="text-[10px] text-text-muted font-medium">
                        {isConnected ? 'Connected' : 'Offline'}
                    </span>
                </div>

                {/* Connection dot — mobile only */}
                <div className={`md:hidden w-2 h-2 rounded-full mr-1 ${isConnected ? 'bg-success animate-pulse-glow' : 'bg-danger'}`} />

                {/* Bell — hidden on mobile */}
                <button className="hidden md:block p-2.5 rounded-lg hover:bg-bg-hover transition-colors text-text-secondary hover:text-text-primary cursor-pointer">
                    <Bell size={16} />
                </button>

                <button
                    onClick={onOpenSettings}
                    className="p-2 md:p-2.5 rounded-lg hover:bg-bg-hover transition-colors text-text-secondary hover:text-text-primary cursor-pointer"
                >
                    <Settings size={15} />
                </button>

                {/* Avatar */}
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-linear-to-br from-accent-primary/30 to-accent-secondary/30 border border-border-default ml-1 md:ml-2 flex items-center justify-center">
                    <span className="text-xs font-semibold text-accent-primary-light">
                        A
                    </span>
                </div>
            </div>
        </header>
    );
}
