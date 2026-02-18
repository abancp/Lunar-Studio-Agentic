import Conf from 'conf';

interface ConfigSchema {
    apiKeys: {
        openai?: string;
        google?: string;
        antigravity?: string;
        groq?: string;
    };
    defaultModels: {
        openai?: string;
        google?: string;
        antigravity?: string;
        groq?: string;
    };
    provider?: 'openai' | 'google' | 'antigravity' | 'groq';
    workspace?: string;
    whatsapp?: {
        enabled: boolean;
        allowedNumbers?: string[]; // E.g., '1234567890@c.us'
        hotword?: string;
    };
    people?: Person[];
    jobs?: ScheduledJob[];
}

export interface ScheduledJob {
    id: string;
    type: 'cron' | 'date';
    value: string; // cron expression or ISO date string
    tool: string;
    args: any;
    createdAt: number;
}

export interface Person {
    id: string; // UUID or sanitized name
    name: string;
    whatsappNumber?: string; // e.g., 1234567890@c.us
    relation: string; // e.g., "Friend", "Boss", "Mother"
    notes?: string; // General behaviors or context
    memoryAccessibleBy?: string[]; // Person IDs who can access this person's memories (default: ["owner"])
}

const config = new Conf<ConfigSchema>({
    projectName: 'lunarstudio',
    defaults: {
        apiKeys: {},
        defaultModels: {},
        workspace: process.env.HOME ? `${process.env.HOME}/lunarstudio/.workspace` : './workspace',
    },
});

export type Provider = 'openai' | 'google' | 'antigravity' | 'groq';

export const getApiKey = (provider: Provider): string | undefined => {
    return config.get(`apiKeys.${provider}`);
};

export const setApiKey = (provider: Provider, key: string): void => {
    config.set(`apiKeys.${provider}`, key);
};

export const getProvider = (): Provider | undefined => {
    return config.get('provider');
};

export const setProvider = (provider: Provider): void => {
    config.set('provider', provider);
};

export const getDefaultModel = (provider: Provider): string | undefined => {
    return config.get(`defaultModels.${provider}`);
};

export const setDefaultModel = (provider: Provider, model: string): void => {
    config.set(`defaultModels.${provider}`, model);
};

export const getWorkspace = (): string => {
    return config.get('workspace') || './workspace';
};

export const setWorkspace = (path: string): void => {
    config.set('workspace', path);
};

export const getWhatsAppConfig = () => {
    return config.get('whatsapp');
};

export const setWhatsAppConfig = (enabled: boolean, allowedNumbers?: string[]) => {
    config.set('whatsapp', { enabled, allowedNumbers });
};


let peopleOverride: Person[] | null = null;

export const setPeopleOverride = (people: Person[] | null) => {
    peopleOverride = people;
};

export const getPeople = (): Person[] => {
    if (peopleOverride) return peopleOverride;
    return config.get('people') || [];
};

export const setPeople = (people: Person[]) => {
    config.set('people', people);
};

let jobsOverride: ScheduledJob[] | null = null;

export const setJobsOverride = (jobs: ScheduledJob[] | null) => {
    jobsOverride = jobs;
};

export const getJobs = (): ScheduledJob[] => {
    if (jobsOverride) return jobsOverride;
    return config.get('jobs') || [];
};

export const setJobs = (jobs: ScheduledJob[]) => {
    if (jobsOverride) {
        jobsOverride = jobs;
        return;
    }
    config.set('jobs', jobs);
};

export const clearConfig = (): void => {
    config.clear();
};
