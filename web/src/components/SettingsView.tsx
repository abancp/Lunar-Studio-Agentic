import { useEffect, useState } from 'react';
import {
    Settings,
    Cpu,
    Key,
    FolderOpen,
    Smartphone,
    Check,
    Eye,
    EyeOff,
    Zap,
    Save,
    RefreshCw,
    ChevronRight,
    Shield,
    Globe,
} from 'lucide-react';
import type { AgentConfig } from '../hooks/useWebSocket';

const PROVIDERS = [
    { id: 'google', name: 'Google', desc: 'Gemini models', color: 'from-blue-500 to-cyan-500' },
    { id: 'openai', name: 'OpenAI', desc: 'GPT models', color: 'from-green-500 to-emerald-500' },
    { id: 'groq', name: 'Groq', desc: 'Fast inference', color: 'from-orange-500 to-amber-500' },
    { id: 'antigravity', name: 'Antigravity', desc: 'Custom provider', color: 'from-purple-500 to-pink-500' },
];

interface SettingsViewProps {
    config: AgentConfig | null;
    onRequestConfig: () => void;
    onUpdateConfig: (key: string, value: any) => void;
}

function SettingSection({ title, icon: Icon, children }: {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-xl bg-bg-tertiary/30 border border-border-default overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 bg-bg-tertiary/40 border-b border-border-default/60">
                <div className="w-6 h-6 rounded-md bg-accent-primary/10 flex items-center justify-center">
                    <Icon size={13} className="text-accent-primary-light" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    {title}
                </span>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

export default function SettingsView({ config, onRequestConfig, onUpdateConfig }: SettingsViewProps) {
    const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({});
    const [modelInputs, setModelInputs] = useState<Record<string, string>>({});
    const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
    const [workspaceInput, setWorkspaceInput] = useState('');
    const [savedKey, setSavedKey] = useState<string | null>(null);

    useEffect(() => {
        onRequestConfig();
    }, [onRequestConfig]);

    useEffect(() => {
        if (config) {
            setModelInputs(config.models || {});
            setWorkspaceInput(config.workspace || '');
        }
    }, [config]);

    const handleSaveApiKey = (provider: string) => {
        const key = apiKeyInputs[provider];
        if (!key?.trim()) return;
        onUpdateConfig('apiKey', { provider, key: key.trim() });
        setApiKeyInputs(prev => ({ ...prev, [provider]: '' }));
        setSavedKey(provider);
        setTimeout(() => setSavedKey(null), 2000);
    };

    const handleSaveModel = (provider: string) => {
        const model = modelInputs[provider];
        if (!model?.trim()) return;
        onUpdateConfig('model', { provider, model: model.trim() });
        setSavedKey(`model-${provider}`);
        setTimeout(() => setSavedKey(null), 2000);
    };

    const handleSaveWorkspace = () => {
        if (!workspaceInput.trim()) return;
        onUpdateConfig('workspace', workspaceInput.trim());
        setSavedKey('workspace');
        setTimeout(() => setSavedKey(null), 2000);
    };

    if (!config) {
        return (
            <main className="flex-1 flex items-center justify-center glass-panel-solid rounded-xl">
                <div className="flex items-center gap-3 text-text-muted">
                    <RefreshCw size={16} className="animate-spin" />
                    <span className="text-sm">Loading configuration...</span>
                </div>
            </main>
        );
    }

    return (
        <main className="flex-1 flex flex-col min-h-0 min-w-0 glass-panel-solid rounded-xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border-default flex items-center justify-between bg-bg-secondary/50 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-accent-primary/10 flex items-center justify-center">
                        <Settings size={14} className="text-accent-primary-light" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-text-primary">Settings</h2>
                        <p className="text-[10px] text-text-muted">Configure your AI agent</p>
                    </div>
                </div>
                <button
                    onClick={onRequestConfig}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-tertiary/50 border border-border-default text-text-muted hover:text-text-primary transition-colors cursor-pointer text-xs"
                >
                    <RefreshCw size={11} />
                    Refresh
                </button>
            </div>

            {/* Settings Content */}
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">

                {/* ── LLM Provider Selection ── */}
                <SettingSection title="LLM Provider" icon={Cpu}>
                    <div className="grid grid-cols-2 gap-3">
                        {PROVIDERS.map((p) => {
                            const isActive = config.provider === p.id;
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => onUpdateConfig('provider', p.id)}
                                    className={`relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer group overflow-hidden ${isActive
                                            ? 'border-accent-primary bg-accent-primary/8 shadow-[0_0_20px_rgba(108,92,231,0.15)]'
                                            : 'border-border-default bg-bg-primary/40 hover:border-border-hover hover:bg-bg-hover/30'
                                        }`}
                                >
                                    {/* Glow effect for active */}
                                    {isActive && (
                                        <div className="absolute inset-0 bg-linear-to-br from-accent-primary/5 to-transparent pointer-events-none" />
                                    )}

                                    <div className={`w-10 h-10 rounded-lg bg-linear-to-br ${p.color} flex items-center justify-center shadow-md shrink-0 relative z-10`}>
                                        <Globe size={16} className="text-white" />
                                    </div>
                                    <div className="flex-1 text-left relative z-10">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-text-primary">{p.name}</span>
                                            {isActive && (
                                                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent-primary/20">
                                                    <Check size={9} className="text-accent-primary-light" />
                                                    <span className="text-[9px] text-accent-primary-light font-semibold">ACTIVE</span>
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[11px] text-text-muted">{p.desc}</span>
                                    </div>

                                    {/* Key status dot */}
                                    <div className="relative z-10">
                                        {config.apiKeys[p.id] ? (
                                            <div className="w-2.5 h-2.5 rounded-full bg-success" title="API key configured" />
                                        ) : (
                                            <div className="w-2.5 h-2.5 rounded-full bg-warning/60" title="No API key" />
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </SettingSection>

                {/* ── API Keys ── */}
                <SettingSection title="API Keys" icon={Key}>
                    <div className="space-y-4">
                        {PROVIDERS.map((p) => (
                            <div key={p.id} className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg bg-linear-to-br ${p.color} flex items-center justify-center shrink-0 shadow-sm`}>
                                    <Globe size={12} className="text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-medium text-text-primary">{p.name}</span>
                                        {config.apiKeys[p.id] ? (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-success/15 text-success font-semibold flex items-center gap-0.5">
                                                <Shield size={8} /> Configured
                                            </span>
                                        ) : (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-warning/15 text-warning font-semibold">
                                                Not set
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex-1 flex items-center rounded-lg bg-bg-primary/60 border border-border-default focus-within:border-accent-primary/40 transition-colors">
                                            <input
                                                type={showKeys[p.id] ? 'text' : 'password'}
                                                value={apiKeyInputs[p.id] || ''}
                                                onChange={(e) => setApiKeyInputs(prev => ({ ...prev, [p.id]: e.target.value }))}
                                                placeholder={config.apiKeys[p.id] ? '••••••••••••' : 'Paste API key...'}
                                                className="flex-1 bg-transparent text-xs text-text-primary placeholder:text-text-muted outline-none px-3 py-2 font-mono"
                                            />
                                            <button
                                                onClick={() => setShowKeys(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                                                className="px-2 text-text-muted hover:text-text-secondary cursor-pointer"
                                            >
                                                {showKeys[p.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => handleSaveApiKey(p.id)}
                                            disabled={!apiKeyInputs[p.id]?.trim()}
                                            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${savedKey === p.id
                                                    ? 'bg-success/20 text-success border border-success/30'
                                                    : apiKeyInputs[p.id]?.trim()
                                                        ? 'bg-accent-primary text-white hover:bg-accent-primary/90'
                                                        : 'bg-bg-tertiary/50 text-text-muted border border-border-default'
                                                }`}
                                        >
                                            {savedKey === p.id ? <><Check size={11} /> Saved</> : <><Save size={11} /> Save</>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </SettingSection>

                {/* ── Models ── */}
                <SettingSection title="Default Models" icon={Zap}>
                    <div className="space-y-3">
                        {PROVIDERS.map((p) => (
                            <div key={p.id} className="flex items-center gap-3">
                                <span className="text-xs font-medium text-text-secondary w-24 shrink-0 capitalize">{p.name}</span>
                                <div className="flex-1 flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={modelInputs[p.id] || ''}
                                        onChange={(e) => setModelInputs(prev => ({ ...prev, [p.id]: e.target.value }))}
                                        placeholder="e.g. gemini-2.0-flash"
                                        className="flex-1 bg-bg-primary/60 border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary font-mono outline-none focus:border-accent-primary/40 transition-colors placeholder:text-text-muted"
                                    />
                                    <button
                                        onClick={() => handleSaveModel(p.id)}
                                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${savedKey === `model-${p.id}`
                                                ? 'bg-success/20 text-success border border-success/30'
                                                : 'bg-bg-tertiary/50 text-text-muted border border-border-default hover:border-border-hover hover:text-text-primary'
                                            }`}
                                    >
                                        {savedKey === `model-${p.id}` ? <><Check size={11} /> Saved</> : <><Save size={11} /> Save</>}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </SettingSection>

                {/* ── Workspace ── */}
                <SettingSection title="Workspace" icon={FolderOpen}>
                    <div className="flex items-center gap-3">
                        <ChevronRight size={12} className="text-text-muted shrink-0" />
                        <div className="flex-1 flex gap-2">
                            <input
                                type="text"
                                value={workspaceInput}
                                onChange={(e) => setWorkspaceInput(e.target.value)}
                                placeholder="/home/user/workspace"
                                className="flex-1 bg-bg-primary/60 border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary font-mono outline-none focus:border-accent-primary/40 transition-colors placeholder:text-text-muted"
                            />
                            <button
                                onClick={handleSaveWorkspace}
                                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${savedKey === 'workspace'
                                        ? 'bg-success/20 text-success border border-success/30'
                                        : 'bg-bg-tertiary/50 text-text-muted border border-border-default hover:border-border-hover hover:text-text-primary'
                                    }`}
                            >
                                {savedKey === 'workspace' ? <><Check size={11} /> Saved</> : <><Save size={11} /> Save</>}
                            </button>
                        </div>
                    </div>
                    <p className="text-[10px] text-text-muted mt-2 ml-7">
                        Directory where the agent executes commands and manages files.
                    </p>
                </SettingSection>

                {/* ── WhatsApp ── */}
                <SettingSection title="WhatsApp Integration" icon={Smartphone}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Smartphone size={16} className={config.whatsapp?.enabled ? 'text-success' : 'text-text-muted'} />
                            <div>
                                <span className="text-sm font-medium text-text-primary">whatsapp-web.js</span>
                                <p className="text-[10px] text-text-muted mt-0.5">
                                    Enable WhatsApp integration for the agent
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => onUpdateConfig('whatsapp', {
                                enabled: !config.whatsapp?.enabled,
                                allowedNumbers: config.whatsapp?.allowedNumbers,
                            })}
                            className={`relative w-11 h-6 rounded-full transition-all duration-300 cursor-pointer ${config.whatsapp?.enabled
                                    ? 'bg-success shadow-[0_0_10px_rgba(34,197,94,0.3)]'
                                    : 'bg-bg-tertiary border border-border-default'
                                }`}
                        >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 ${config.whatsapp?.enabled ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                        </button>
                    </div>
                </SettingSection>

                {/* ── People / Known Contacts ── */}
                {config.people && config.people.length > 0 && (
                    <SettingSection title={`Known People (${config.people.length})`} icon={Globe}>
                        <div className="space-y-2">
                            {config.people.map((person: any, i: number) => (
                                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-bg-primary/40 border border-border-default/50">
                                    <div className="w-8 h-8 rounded-full bg-accent-primary/15 flex items-center justify-center shrink-0">
                                        <span className="text-xs font-semibold text-accent-primary-light">
                                            {(person.name || '?')[0]?.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-xs font-medium text-text-primary">{person.name}</span>
                                        <span className="text-[10px] text-text-muted ml-2">({person.relation})</span>
                                    </div>
                                    {person.whatsappNumber && (
                                        <span className="text-[10px] text-text-muted font-mono">{person.whatsappNumber}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </SettingSection>
                )}
            </div>
        </main>
    );
}
