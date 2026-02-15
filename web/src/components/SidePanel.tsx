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
} from 'lucide-react';

interface NavItem {
    icon: React.ElementType;
    label: string;
    badge?: string;
    active?: boolean;
}

interface ToolItem {
    icon: React.ElementType;
    name: string;
    status: 'active' | 'idle';
}

const navItems: NavItem[] = [
    { icon: MessageSquare, label: 'Chat', active: true },
    { icon: Brain, label: 'Memory', badge: '24' },
    { icon: Wrench, label: 'Tools' },
    { icon: ScrollText, label: 'Logs' },
    { icon: Smartphone, label: 'Apps' },
];

const tools: ToolItem[] = [
    { icon: Calculator, name: 'Calculator', status: 'active' },
    { icon: Cloud, name: 'Weather', status: 'active' },
    { icon: FolderOpen, name: 'Workspace', status: 'active' },
    { icon: Search, name: 'Web Search', status: 'idle' },
];

const recentChats = [
    { id: 1, title: 'Project Setup', time: '2m ago', starred: true },
    { id: 2, title: 'Memory Config', time: '15m ago', starred: false },
    { id: 3, title: 'WhatsApp Integration', time: '1h ago', starred: true },
    { id: 4, title: 'Tool Debugging', time: '3h ago', starred: false },
];

export default function SidePanel() {
    const [activeNav, setActiveNav] = useState('Chat');
    const [toolsExpanded, setToolsExpanded] = useState(true);
    const [chatsExpanded, setChatsExpanded] = useState(true);

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
                    const isActive = activeNav === item.label;
                    return (
                        <button
                            key={item.label}
                            onClick={() => setActiveNav(item.label)}
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
                            {item.badge && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-accent-primary/15 text-accent-primary-light">
                                    {item.badge}
                                </span>
                            )}
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
                        className={`text-text-muted transition-transform duration-200 ${chatsExpanded ? 'rotate-90' : ''
                            }`}
                    />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted group-hover:text-text-secondary transition-colors">
                        Recent
                    </span>
                    <Clock size={10} className="text-text-muted ml-auto" />
                </button>

                {chatsExpanded && (
                    <div className="space-y-0.5 animate-fade-in">
                        {recentChats.map((chat) => (
                            <button
                                key={chat.id}
                                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-all duration-150 cursor-pointer group"
                            >
                                <Hash size={12} className="text-text-muted shrink-0" />
                                <span className="text-xs font-medium truncate flex-1 text-left">
                                    {chat.title}
                                </span>
                                {chat.starred && (
                                    <Star
                                        size={10}
                                        className="text-warning/60 fill-warning/60 shrink-0"
                                    />
                                )}
                                <span className="text-[10px] text-text-muted font-mono shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {chat.time}
                                </span>
                            </button>
                        ))}
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
                        className={`text-text-muted transition-transform duration-200 ${toolsExpanded ? 'rotate-90' : ''
                            }`}
                    />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted group-hover:text-text-secondary transition-colors">
                        Tools
                    </span>
                    <Sparkles size={10} className="text-accent-primary-light/40 ml-auto" />
                </button>

                {toolsExpanded && (
                    <div className="space-y-0.5 animate-fade-in">
                        {tools.map((tool) => (
                            <div
                                key={tool.name}
                                className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-bg-hover transition-colors group cursor-default"
                            >
                                <tool.icon
                                    size={13}
                                    className="text-text-muted group-hover:text-text-secondary shrink-0"
                                />
                                <span className="text-xs text-text-secondary group-hover:text-text-primary flex-1 font-medium">
                                    {tool.name}
                                </span>
                                <div
                                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${tool.status === 'active'
                                            ? 'bg-success/70'
                                            : 'bg-text-muted/30'
                                        }`}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom — WhatsApp Status */}
            <div className="p-4 border-t border-border-default">
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-bg-tertiary/40 border border-border-default">
                    <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
                        <Smartphone size={14} className="text-success" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-xs font-medium text-text-primary truncate">
                            WhatsApp
                        </span>
                        <span className="text-[10px] text-success font-medium">
                            Connected
                        </span>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-success/60 animate-pulse-glow" />
                </div>
            </div>
        </aside>
    );
}
