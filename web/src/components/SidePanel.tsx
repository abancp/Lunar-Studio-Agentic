import { useState } from 'react';
import {
    MessageSquare,
    Brain,
    Wrench,
    ScrollText,
    Smartphone,
    Calculator,
    Cloud,
    FolderOpen,
    Search,
    Plus,
    ChevronRight,
    Hash,
    Clock,
    Star,
    Sparkles,
    Terminal,
} from 'lucide-react';
import type { AgentStatus, NavPage } from '../hooks/useWebSocket';

const TOOL_ICONS: Record<string, React.ElementType> = {
    calculator: Calculator,
    weather: Cloud,
    list_directory: FolderOpen,
    search_files: Search,
    execute_command: Terminal,
};

interface NavItem {
    icon: React.ElementType;
    label: string;
    page: NavPage;
}

const navItems: NavItem[] = [
    { icon: MessageSquare, label: 'Chat', page: 'chat' },
    { icon: Brain, label: 'Memory', page: 'memory' },
    { icon: Wrench, label: 'Tools', page: 'tools' },
    { icon: ScrollText, label: 'Logs', page: 'logs' },
    { icon: Smartphone, label: 'Apps', page: 'apps' },
];

interface SidePanelProps {
    agentStatus: AgentStatus | null;
    activePage: NavPage;
    onNavigate: (page: NavPage) => void;
}

export default function SidePanel({ agentStatus, activePage, onNavigate }: SidePanelProps) {
    const [toolsExpanded, setToolsExpanded] = useState(true);
    const [chatsExpanded, setChatsExpanded] = useState(true);

    const toolNames = agentStatus?.tools || [];

    return (
        <aside className="w-72 glass-panel-solid rounded-xl flex flex-col h-full overflow-hidden">
            {/* Search + New Chat */}
            <div className="p-4 flex gap-2">
                <div className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-bg-tertiary/50 border border-border-default focus-within:border-accent-primary/40 transition-colors">
                    <Search size={14} className="text-text-muted shrink-0" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="bg-transparent text-xs text-text-primary outline-none w-full placeholder:text-text-muted"
                    />
                </div>
                <button className="p-2.5 rounded-lg bg-accent-primary/15 border border-accent-primary/20 text-accent-primary-light hover:bg-accent-primary/25 transition-colors cursor-pointer">
                    <Plus size={14} />
                </button>
            </div>

            {/* Navigation */}
            <nav className="px-3 pb-2">
                {navItems.map((item) => {
                    const isActive = activePage === item.page;
                    return (
                        <button
                            key={item.page}
                            onClick={() => onNavigate(item.page)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all duration-200 cursor-pointer group
                ${isActive
                                    ? 'bg-accent-primary/12 text-accent-primary-light border border-accent-primary/15'
                                    : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary border border-transparent'
                                }`}
                        >
                            <item.icon
                                size={16}
                                className={
                                    isActive
                                        ? 'text-accent-primary-light'
                                        : 'text-text-muted group-hover:text-text-secondary'
                                }
                            />
                            <span className="text-xs font-medium flex-1 text-left">
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </nav>

            <div className="h-px bg-border-default mx-4 my-1" />

            {/* Recent Chats */}
            <div className="px-3 flex-1 overflow-y-auto min-h-0">
                <button
                    onClick={() => setChatsExpanded(!chatsExpanded)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 cursor-pointer group"
                >
                    <ChevronRight
                        size={12}
                        className={`text-text-muted transition-transform duration-200 ${chatsExpanded ? 'rotate-90' : ''}`}
                    />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted group-hover:text-text-secondary transition-colors">
                        Recent
                    </span>
                    <Clock size={10} className="text-text-muted ml-auto" />
                </button>

                {chatsExpanded && (
                    <div className="space-y-0.5 animate-fade-in">
                        <button
                            onClick={() => onNavigate('chat')}
                            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-all duration-150 cursor-pointer group"
                        >
                            <Hash size={12} className="text-text-muted shrink-0" />
                            <span className="text-xs font-medium truncate flex-1 text-left">
                                Current Session
                            </span>
                            <Star size={10} className="text-warning/60 fill-warning/60 shrink-0" />
                        </button>
                    </div>
                )}

                <div className="h-px bg-border-default mx-2 my-2" />

                {/* Agent Tools */}
                <button
                    onClick={() => setToolsExpanded(!toolsExpanded)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 cursor-pointer group"
                >
                    <ChevronRight
                        size={12}
                        className={`text-text-muted transition-transform duration-200 ${toolsExpanded ? 'rotate-90' : ''}`}
                    />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted group-hover:text-text-secondary transition-colors">
                        Tools
                    </span>
                    <Sparkles size={10} className="text-accent-primary-light/40 ml-auto" />
                </button>

                {toolsExpanded && (
                    <div className="space-y-0.5 animate-fade-in">
                        {toolNames.map((name) => {
                            const Icon = TOOL_ICONS[name] || Wrench;
                            return (
                                <div
                                    key={name}
                                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-bg-hover transition-colors group cursor-default"
                                >
                                    <Icon size={13} className="text-text-muted group-hover:text-text-secondary shrink-0" />
                                    <span className="text-xs text-text-secondary group-hover:text-text-primary flex-1 font-medium">
                                        {name}
                                    </span>
                                    <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-success/70" />
                                </div>
                            );
                        })}
                        {toolNames.length === 0 && (
                            <p className="text-xs text-text-muted px-4 py-2">Connecting...</p>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom — WhatsApp Status */}
            <div className="p-4 border-t border-border-default">
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-bg-tertiary/40 border border-border-default">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${agentStatus?.whatsapp === 'connected' ? 'bg-success/10' : 'bg-text-muted/10'
                        }`}>
                        <Smartphone size={14} className={
                            agentStatus?.whatsapp === 'connected' ? 'text-success' : 'text-text-muted'
                        } />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-xs font-medium text-text-primary truncate">WhatsApp</span>
                        <span className={`text-[10px] font-medium ${agentStatus?.whatsapp === 'connected' ? 'text-success' : 'text-text-muted'
                            }`}>
                            {agentStatus?.whatsapp === 'connected' ? 'Connected' : 'Disabled'}
                        </span>
                    </div>
                    {agentStatus?.whatsapp === 'connected' && (
                        <div className="w-2 h-2 rounded-full bg-success/60 animate-pulse-glow" />
                    )}
                </div>
            </div>
        </aside>
    );
}
