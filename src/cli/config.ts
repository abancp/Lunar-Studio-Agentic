import Conf from 'conf';

interface ConfigSchema {
    apiKeys: {
        openai?: string;
        google?: string;
        antigravity?: string;
    };
    defaultModels: {
        openai?: string;
        google?: string;
        antigravity?: string;
    };
    provider?: 'openai' | 'google' | 'antigravity';
    workspace?: string;
}

const config = new Conf<ConfigSchema>({
    projectName: 'llm-engine-cli',
    defaults: {
        apiKeys: {},
        defaultModels: {},
        workspace: process.env.HOME ? `${process.env.HOME}/lunarstudio/.workspace` : './workspace',
    },
});

export type Provider = 'openai' | 'google' | 'antigravity';

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

export const clearConfig = (): void => {
    config.clear();
};
