import { useEffect } from 'react';
import {
    Wrench,
    Calculator,
    Cloud,
    FolderOpen,
    Search,
    Terminal,
    Zap,
    ChevronRight,
} from 'lucide-react';
import type { ToolDetail } from '../hooks/useWebSocket';

interface ToolsViewProps {
    toolDetails: ToolDetail[];
    onRequestTools: () => void;
}

const TOOL_ICONS: Record<string, React.ElementType> = {
    calculator: Calculator,
    weather: Cloud,
    list_directory: FolderOpen,
    search_files: Search,
    execute_command: Terminal,
};

export default function ToolsView({ toolDetails, onRequestTools }: ToolsViewProps) {
    useEffect(() => {
        onRequestTools();
    }, [onRequestTools]);

    return (
        <main className="flex-1 flex flex-col min-h-0 min-w-0 glass-panel-solid rounded-xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border-default flex items-center justify-between bg-bg-secondary/50 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-accent-primary/10 flex items-center justify-center">
                        <Wrench size={14} className="text-accent-primary-light" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-text-primary">Agent Tools</h2>
                        <p className="text-[10px] text-text-muted">{toolDetails.length} tools available</p>
                    </div>
                </div>
            </div>

            {/* Tool Cards */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-3">
                {toolDetails.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-text-muted">
                        <Wrench size={40} className="opacity-20 mb-4" />
                        <p className="text-sm">Loading tools...</p>
                    </div>
                )}

                {toolDetails.map((tool) => {
                    const Icon = TOOL_ICONS[tool.name] || Wrench;
                    const params = tool.schema?.properties
                        ? Object.entries(tool.schema.properties as Record<string, any>)
                        : [];

                    return (
                        <div
                            key={tool.name}
                            className="rounded-xl bg-bg-tertiary/40 border border-border-default hover:border-border-hover transition-colors overflow-hidden"
                        >
                            {/* Tool Header */}
                            <div className="flex items-center gap-3 px-5 py-4">
                                <div className="w-9 h-9 rounded-lg bg-accent-primary/10 flex items-center justify-center shrink-0">
                                    <Icon size={16} className="text-accent-primary-light" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-semibold text-text-primary">{tool.name}</h3>
                                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-success/10">
                                            <Zap size={9} className="text-success" />
                                            <span className="text-[10px] text-success font-medium">Active</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                                        {tool.description}
                                    </p>
                                </div>
                            </div>

                            {/* Parameters */}
                            {params.length > 0 && (
                                <div className="border-t border-border-default/60 px-5 py-3 bg-bg-primary/30">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                                        Parameters
                                    </span>
                                    <div className="mt-2 space-y-1.5">
                                        {params.map(([name, info]: [string, any]) => (
                                            <div key={name} className="flex items-start gap-2">
                                                <ChevronRight size={10} className="text-text-muted mt-1 shrink-0" />
                                                <code className="text-xs font-mono text-accent-primary-light">{name}</code>
                                                <span className="text-[10px] text-text-muted px-1.5 py-0.5 rounded bg-bg-tertiary/60">
                                                    {info.type || 'any'}
                                                </span>
                                                {info.description && (
                                                    <span className="text-xs text-text-secondary flex-1">
                                                        {info.description}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </main>
    );
}
