
declare module 'google-tts-api' {
    interface Options {
        lang?: string;
        slow?: boolean;
        host?: string;
        timeout?: number;
        splitPunct?: string;
    }

    export function getAudioUrl(text: string, options?: Options): string;

    export function getAllAudioUrls(text: string, options?: Options): { url: string; shortText: string }[];
}
