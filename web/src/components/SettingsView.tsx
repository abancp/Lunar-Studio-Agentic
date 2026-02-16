import { useEffect, useState } from 'react';
import {
    Settings,
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
    X,
    Users,
    Cpu,
} from 'lucide-react';
import type { AgentConfig } from '../hooks/useWebSocket';

// ── Constants ──

const PROVIDERS = [
    { id: 'google', name: 'Google', desc: 'Gemini models', color: 'from-blue-500 to-cyan-500' },
    { id: 'openai', name: 'OpenAI', desc: 'GPT models', color: 'from-green-500 to-emerald-500' },
    { id: 'groq', name: 'Groq', desc: 'Fast inference', color: 'from-orange-500 to-amber-500' },
    { id: 'antigravity', name: 'Antigravity', desc: 'Custom provider', color: 'from-purple-500 to-pink-500' },
];

type SettingsTab = 'model' | 'workspace' | 'whatsapp' | 'people';

const TABS: { id: SettingsTab; label: string; icon: React.ElementType; desc: string }[] = [
    { id: 'model', label: 'Model', icon: Cpu, desc: 'Provider, keys & models' },
    { id: 'workspace', label: 'Workspace', icon: FolderOpen, desc: 'File paths' },
    { id: 'whatsapp', label: 'WhatsApp', icon: Smartphone, desc: 'Integration' },
    { id: 'people', label: 'People', icon: Users, desc: 'Known contacts' },
];

// ── Props ──

interface SettingsViewProps {
    isOpen: boolean;
    onClose: () => void;
    config: AgentConfig | null;
    onRequestConfig: () => void;
    onUpdateConfig: (key: string, value: any) => void;
}

// ── Component ──

export default function SettingsView({ isOpen, onClose, config, onRequestConfig, onUpdateConfig }: SettingsViewProps) {
    const [activeTab, setActiveTab] = useState<SettingsTab>('model');
    const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({});
    const [modelInputs, setModelInputs] = useState<Record<string, string>>({});
    const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
    const [workspaceInput, setWorkspaceInput] = useState('');
    const [savedKey, setSavedKey] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) onRequestConfig();
    }, [isOpen, onRequestConfig]);

    useEffect(() => {
        if (config) {
            setModelInputs(config.models || {});
            setWorkspaceInput(config.workspace || '');
        }
    }, [config]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handler);
            return () => window.removeEventListener('keydown', handler);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const flash = (key: string) => {
        setSavedKey(key);
        setTimeout(() => setSavedKey(null), 2000);
    };

    const handleSaveApiKey = (provider: string) => {
        const key = apiKeyInputs[provider];
        if (!key?.trim()) return;
        onUpdateConfig('apiKey', { provider, key: key.trim() });
        setApiKeyInputs(prev => ({ ...prev, [provider]: '' }));
        flash(`key-${provider}`);
    };

    const handleSaveModel = (provider: string) => {
        const model = modelInputs[provider];
        if (!model?.trim()) return;
        onUpdateConfig('model', { provider, model: model.trim() });
        flash(`model-${provider}`);
    };

    const handleSaveWorkspace = () => {
        if (!workspaceInput.trim()) return;
        onUpdateConfig('workspace', workspaceInput.trim());
        flash('workspace');
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            {/* Darker backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-lg" />

            {/* ── Bigger Modal ── */}
            <div
                className="relative w-[960px] max-w-[94vw] h-[680px] max-h-[90vh] rounded-2xl border border-border-default overflow-hidden flex shadow-2xl"
                style={{ background: 'linear-gradient(145deg, rgba(18,18,26,0.98), rgba(10,10,15,0.99))' }}
            >
                {/* ── Settings Sidebar ── */}
                <div className="w-60 shrink-0 border-r border-border-default flex flex-col bg-bg-secondary/40">
                    {/* Sidebar Header */}
                    <div className="px-5 pt-6 pb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-accent-primary/15 flex items-center justify-center">
                                <Settings size={16} className="text-accent-primary-light" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-text-primary">Settings</h2>
                                <p className="text-[10px] text-text-muted">Configure your agent</p>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Nav */}
                    <nav className="flex-1 px-3 pb-3 space-y-1 overflow-y-auto">
                        {TABS.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 cursor-pointer group ${isActive
                                        ? 'bg-accent-primary/12 border border-accent-primary/20 shadow-sm'
                                        : 'border border-transparent hover:bg-bg-hover/60 hover:border-border-default/50'
                                        }`}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isActive
                                        ? 'bg-accent-primary/20'
                                        : 'bg-bg-tertiary/40 group-hover:bg-bg-tertiary/60'
                                        }`}>
                                        <tab.icon size={14} className={
                                            isActive ? 'text-accent-primary-light' : 'text-text-muted group-hover:text-text-secondary'
                                        } />
                                    </div>
                                    <div className="flex flex-col text-left">
                                        <span className={`text-xs font-medium leading-tight ${isActive ? 'text-accent-primary-light' : 'text-text-secondary group-hover:text-text-primary'
                                            }`}>{tab.label}</span>
                                        <span className="text-[9px] text-text-muted leading-tight mt-0.5">{tab.desc}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </nav>

                    {/* Sidebar Footer */}
                    <div className="px-4 py-3 border-t border-border-default/50">
                        <button
                            onClick={onRequestConfig}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-bg-tertiary/30 border border-border-default text-text-muted hover:text-text-secondary hover:border-border-hover text-[11px] font-medium transition-colors cursor-pointer"
                        >
                            <RefreshCw size={11} />
                            Reload Config
                        </button>
                    </div>
                </div>

                {/* ── Main Content ── */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-7 py-5 border-b border-border-default/50 shrink-0">
                        <div>
                            <h3 className="text-base font-semibold text-text-primary">
                                {TABS.find(t => t.id === activeTab)?.label}
                            </h3>
                            <p className="text-[11px] text-text-muted mt-0.5">
                                {TABS.find(t => t.id === activeTab)?.desc}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto px-7 py-6">
                        {!config ? (
                            <div className="flex items-center justify-center h-full gap-3 text-text-muted">
                                <RefreshCw size={14} className="animate-spin" />
                                <span className="text-sm">Loading...</span>
                            </div>
                        ) : (
                            <>
                                {activeTab === 'model' && (
                                    <ModelTab
                                        config={config}
                                        onUpdateConfig={onUpdateConfig}
                                        apiKeyInputs={apiKeyInputs}
                                        setApiKeyInputs={setApiKeyInputs}
                                        showKeys={showKeys}
                                        setShowKeys={setShowKeys}
                                        modelInputs={modelInputs}
                                        setModelInputs={setModelInputs}
                                        savedKey={savedKey}
                                        onSaveKey={handleSaveApiKey}
                                        onSaveModel={handleSaveModel}
                                    />
                                )}
                                {activeTab === 'workspace' && (
                                    <WorkspaceTab
                                        workspaceInput={workspaceInput}
                                        setWorkspaceInput={setWorkspaceInput}
                                        savedKey={savedKey}
                                        onSave={handleSaveWorkspace}
                                    />
                                )}
                                {activeTab === 'whatsapp' && (
                                    <WhatsAppTab config={config} onUpdateConfig={onUpdateConfig} />
                                )}
                                {activeTab === 'people' && (
                                    <PeopleTab config={config} />
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════
// ── Combined Model Tab (Provider + Keys + Models) ──
// ═══════════════════════════════════════════════════════

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <div className="mb-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">{title}</h4>
            <p className="text-[11px] text-text-muted mt-0.5">{subtitle}</p>
        </div>
    );
}

function ModelTab({ config, onUpdateConfig, apiKeyInputs, setApiKeyInputs, showKeys, setShowKeys, modelInputs, setModelInputs, savedKey, onSaveKey, onSaveModel }: {
    config: AgentConfig;
    onUpdateConfig: (key: string, value: any) => void;
    apiKeyInputs: Record<string, string>;
    setApiKeyInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    showKeys: Record<string, boolean>;
    setShowKeys: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    modelInputs: Record<string, string>;
    setModelInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    savedKey: string | null;
    onSaveKey: (provider: string) => void;
    onSaveModel: (provider: string) => void;
}) {
    const activeProvider = PROVIDERS.find(p => p.id === config.provider) || PROVIDERS[0];
    const p = activeProvider;
    const keySaved = savedKey === `key-${p.id}`;
    const modelSaved = savedKey === `model-${p.id}`;

    return (
        <div className="space-y-7">
            {/* ── Provider Selector ── */}
            <div>
                <SectionHeader title="Provider" subtitle="Select your LLM provider" />
                <div className="flex gap-2">
                    {PROVIDERS.map((prov) => {
                        const isActive = config.provider === prov.id;
                        return (
                            <button
                                key={prov.id}
                                onClick={() => onUpdateConfig('provider', prov.id)}
                                className={`flex-1 flex items-center justify-center gap-2.5 px-3 py-3 rounded-xl border-2 transition-all duration-200 cursor-pointer ${isActive
                                    ? 'border-accent-primary bg-accent-primary/10 shadow-[0_0_16px_rgba(108,92,231,0.12)]'
                                    : 'border-border-default/50 bg-bg-primary/30 hover:border-border-hover hover:bg-bg-hover/20'
                                    }`}
                            >
                                <div className={`w-7 h-7 rounded-lg bg-linear-to-br ${prov.color} flex items-center justify-center shadow-sm shrink-0`}>
                                    <Globe size={12} className="text-white" />
                                </div>
                                <div className="flex flex-col text-left">
                                    <span className={`text-xs font-semibold leading-tight ${isActive ? 'text-accent-primary-light' : 'text-text-primary'}`}>
                                        {prov.name}
                                    </span>
                                    <span className="text-[9px] text-text-muted leading-tight">{prov.desc}</span>
                                </div>
                                {isActive && (
                                    <Check size={14} className="text-accent-primary-light shrink-0 ml-auto" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Selected Provider Details ── */}
            <div className="rounded-2xl border border-border-default bg-bg-tertiary/15 overflow-hidden">
                {/* Provider header */}
                <div className="flex items-center gap-3.5 px-5 py-4 bg-bg-tertiary/30 border-b border-border-default/50">
                    <div className={`w-10 h-10 rounded-xl bg-linear-to-br ${p.color} flex items-center justify-center shadow-lg shrink-0`}>
                        <Globe size={16} className="text-white" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-text-primary">{p.name}</span>
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-accent-primary/20 text-accent-primary-light tracking-wider">
                                ACTIVE
                            </span>
                        </div>
                        <span className="text-[11px] text-text-muted">{p.desc}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {config.apiKeys[p.id] ? (
                            <span className="text-[10px] px-2 py-1 rounded-full bg-success/15 text-success font-semibold flex items-center gap-1">
                                <Shield size={9} /> Key configured
                            </span>
                        ) : (
                            <span className="text-[10px] px-2 py-1 rounded-full bg-warning/15 text-warning font-semibold">
                                ⚠ No API key
                            </span>
                        )}
                    </div>
                </div>

                {/* Settings for selected provider */}
                <div className="px-5 py-5 space-y-5">
                    {/* API Key */}
                    <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-1.5 mb-2.5">
                            <Key size={11} />
                            API Key
                        </label>
                        <div className="flex gap-2">
                            <div className="flex-1 flex items-center rounded-xl bg-bg-primary/50 border border-border-default focus-within:border-accent-primary/40 transition-all">
                                <input
                                    type={showKeys[p.id] ? 'text' : 'password'}
                                    value={apiKeyInputs[p.id] || ''}
                                    onChange={(e) => setApiKeyInputs(prev => ({ ...prev, [p.id]: e.target.value }))}
                                    placeholder={config.apiKeys[p.id] ? '•••••••••••••••• (paste new key to replace)' : `Enter your ${p.name} API key...`}
                                    className="flex-1 bg-transparent text-xs text-text-primary placeholder:text-text-muted outline-none px-4 py-3 font-mono"
                                    onKeyDown={(e) => { if (e.key === 'Enter') onSaveKey(p.id); }}
                                />
                                <button
                                    onClick={() => setShowKeys(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                                    className="px-3 text-text-muted hover:text-text-secondary cursor-pointer transition-colors"
                                >
                                    {showKeys[p.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                            <button
                                onClick={() => onSaveKey(p.id)}
                                disabled={!apiKeyInputs[p.id]?.trim()}
                                className={`px-4 py-3 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${keySaved
                                    ? 'bg-success/20 text-success border border-success/30'
                                    : apiKeyInputs[p.id]?.trim()
                                        ? 'bg-accent-primary text-white hover:bg-accent-primary/90 shadow-md shadow-accent-primary/20'
                                        : 'bg-bg-tertiary/50 text-text-muted border border-border-default'
                                    }`}
                            >
                                {keySaved ? <><Check size={12} /> Saved!</> : <><Save size={12} /> Save</>}
                            </button>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-border-default/30" />

                    {/* Default Model */}
                    <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-1.5 mb-2.5">
                            <Zap size={11} />
                            Default Model
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={modelInputs[p.id] || ''}
                                onChange={(e) => setModelInputs(prev => ({ ...prev, [p.id]: e.target.value }))}
                                placeholder={`e.g. ${p.id === 'google' ? 'gemini-2.0-flash' : p.id === 'openai' ? 'gpt-4o' : p.id === 'groq' ? 'llama-3.3-70b-versatile' : 'default'}`}
                                className="flex-1 bg-bg-primary/50 border border-border-default rounded-xl px-4 py-3 text-xs text-text-primary font-mono outline-none focus:border-accent-primary/40 transition-colors placeholder:text-text-muted"
                                onKeyDown={(e) => { if (e.key === 'Enter') onSaveModel(p.id); }}
                            />
                            <button
                                onClick={() => onSaveModel(p.id)}
                                className={`px-4 py-3 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${modelSaved
                                    ? 'bg-success/20 text-success border border-success/30'
                                    : 'bg-bg-tertiary/50 text-text-muted border border-border-default hover:border-border-hover hover:text-text-primary'
                                    }`}
                            >
                                {modelSaved ? <><Check size={12} /> Saved!</> : <><Save size={12} /> Save</>}
                            </button>
                        </div>
                        <p className="text-[10px] text-text-muted mt-2 flex items-center gap-1">
                            <ChevronRight size={8} />
                            The model the agent will use when {p.name} is the active provider.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Workspace Tab ──

function WorkspaceTab({ workspaceInput, setWorkspaceInput, savedKey, onSave }: {
    workspaceInput: string;
    setWorkspaceInput: (v: string) => void;
    savedKey: string | null;
    onSave: () => void;
}) {
    const isSaved = savedKey === 'workspace';
    return (
        <div className="space-y-5">
            <p className="text-xs text-text-secondary leading-relaxed">
                The workspace is the directory where the agent can execute commands, read/write files, and manage your projects.
            </p>
            <div className="rounded-xl bg-bg-tertiary/20 border border-border-default/50 p-5">
                <div className="flex items-center gap-2.5 mb-3">
                    <FolderOpen size={14} className="text-accent-primary-light" />
                    <span className="text-xs font-semibold text-text-primary">Workspace Path</span>
                </div>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={workspaceInput}
                        onChange={(e) => setWorkspaceInput(e.target.value)}
                        placeholder="/home/user/lunarstudio/workspace"
                        className="flex-1 bg-bg-primary/50 border border-border-default rounded-xl px-4 py-3 text-sm text-text-primary font-mono outline-none focus:border-accent-primary/40 transition-colors placeholder:text-text-muted"
                        onKeyDown={(e) => { if (e.key === 'Enter') onSave(); }}
                    />
                    <button
                        onClick={onSave}
                        className={`px-5 py-3 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${isSaved
                            ? 'bg-success/20 text-success border border-success/30'
                            : 'bg-accent-primary text-white hover:bg-accent-primary/90 shadow-md shadow-accent-primary/20'
                            }`}
                    >
                        {isSaved ? <><Check size={12} /> Saved!</> : <><Save size={12} /> Save</>}
                    </button>
                </div>
                <p className="text-[10px] text-text-muted mt-3 flex items-center gap-1.5">
                    <ChevronRight size={9} />
                    Tools like execute_command and search_files operate within this directory.
                </p>
            </div>
        </div>
    );
}

// ── WhatsApp Tab ──

function WhatsAppTab({ config, onUpdateConfig }: { config: AgentConfig; onUpdateConfig: (key: string, value: any) => void }) {
    return (
        <div className="space-y-5">
            <p className="text-xs text-text-secondary leading-relaxed">
                Connect the agent to WhatsApp using whatsapp-web.js. When enabled, the daemon will scan a QR code on startup.
            </p>
            <div className="rounded-xl bg-bg-tertiary/20 border border-border-default/50 p-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${config.whatsapp?.enabled
                            ? 'bg-success/15 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                            : 'bg-bg-tertiary/50'
                            }`}>
                            <Smartphone size={18} className={config.whatsapp?.enabled ? 'text-success' : 'text-text-muted'} />
                        </div>
                        <div>
                            <span className="text-sm font-semibold text-text-primary block">WhatsApp Integration</span>
                            <span className="text-[11px] text-text-muted">
                                {config.whatsapp?.enabled ? 'Connected and active' : 'Currently disabled'}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={() => onUpdateConfig('whatsapp', {
                            enabled: !config.whatsapp?.enabled,
                            allowedNumbers: config.whatsapp?.allowedNumbers,
                        })}
                        className={`relative w-12 h-7 rounded-full transition-all duration-300 cursor-pointer ${config.whatsapp?.enabled
                            ? 'bg-success shadow-[0_0_12px_rgba(34,197,94,0.3)]'
                            : 'bg-bg-tertiary border border-border-default'
                            }`}
                    >
                        <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${config.whatsapp?.enabled ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── People Tab ──

function PeopleTab({ config }: { config: AgentConfig }) {
    return (
        <div className="space-y-4">
            <p className="text-xs text-text-secondary leading-relaxed">
                People the agent knows about. These are configured via the CLI with <code className="px-1 py-0.5 bg-bg-tertiary/60 rounded text-accent-primary-light font-mono text-[11px]">lunarstudio setup</code>.
            </p>
            {(!config.people || config.people.length === 0) ? (
                <div className="rounded-xl bg-bg-tertiary/20 border border-border-default/50 p-8 flex flex-col items-center gap-3 text-text-muted">
                    <Users size={28} className="opacity-30" />
                    <span className="text-sm">No people configured yet.</span>
                    <span className="text-[11px]">Run <code className="px-1.5 py-0.5 rounded bg-bg-tertiary/60 font-mono text-accent-primary-light">lunarstudio setup</code> to add contacts.</span>
                </div>
            ) : (
                <div className="space-y-2">
                    {config.people.map((person: any, i: number) => (
                        <div key={i} className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl bg-bg-tertiary/20 border border-border-default/50 hover:border-border-hover transition-colors">
                            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-accent-primary/20 to-accent-secondary/20 flex items-center justify-center shrink-0">
                                <span className="text-sm font-bold text-accent-primary-light">
                                    {(person.name || '?')[0]?.toUpperCase()}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-text-primary">{person.name}</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-primary/10 text-accent-primary-light">
                                        {person.relation}
                                    </span>
                                </div>
                                {person.notes && (
                                    <p className="text-[11px] text-text-muted mt-0.5 truncate">{person.notes}</p>
                                )}
                            </div>
                            {person.whatsappNumber && (
                                <span className="text-[10px] text-text-muted font-mono shrink-0">
                                    {person.whatsappNumber.replace('@c.us', '')}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
