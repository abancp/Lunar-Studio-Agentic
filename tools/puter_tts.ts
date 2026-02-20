import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../src/log.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const TTS_DIR = path.join(os.homedir(), 'lunarstudio', 'tts_cache');

if (!fs.existsSync(TTS_DIR)) {
    fs.mkdirSync(TTS_DIR, { recursive: true });
}

export async function generateTTS(text: string): Promise<{ path: string; duration: number }> {
    const id = uuidv4();
    const outputPath = path.join(TTS_DIR, `tts_${id}.mp3`);

    logger.info(`Generating TTS for: "${text.substring(0, 20)}..."`);

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            executablePath: '/usr/bin/chromium',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--autoplay-policy=no-user-gesture-required'
            ],
            protocolTimeout: 600000
        });

        const page = await browser.newPage();

        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded' });

        await page.addScriptTag({ url: 'https://js.puter.com/v2/' });

        await page.waitForFunction('window.puter !== undefined && window.puter.ai !== undefined', { timeout: 60000 });

        let result: any = { error: 'Unknown error' };

        // Retry logic for TTS
        for (let i = 0; i < 3; i++) {
            try {
                result = await page.evaluate(async (text) => {
                    try {
                        // @ts-ignore
                        const audio = await window.puter.ai.txt2speech(text);

                        // @ts-ignore
                        if (audio instanceof window.HTMLAudioElement) {
                            return { type: 'audio_element', src: audio.src };
                        } else if (typeof audio === 'object' && audio.src) {
                            return { type: 'audio_element', src: audio.src };
                        }

                        return { type: 'unknown', data: audio };
                    } catch (e: any) {
                        return { error: e.toString() };
                    }
                }, text);

                if (!result.error) break;
                // logger.warn(\`TTS attempt \${i+1} failed: \${result.error}\`); // logger not available in page context obviously
                await new Promise(r => setTimeout(r, 2000));
            } catch (e: any) {
                // logger.warn(\`TTS attempt \${i+1} threw: \${e}\`);
            }
        }

        if (result.error) {
            throw new Error(`Puter TTS Error: ${result.error}`);
        }

        if (result.type === 'audio_element' && result.src) {
            const audioSrc = result.src;
            const audioBufferBase64 = await page.evaluate(async (src) => {
                const response = await fetch(src);
                const buffer = await response.arrayBuffer();
                return btoa(String.fromCharCode(...new Uint8Array(buffer)));
            }, audioSrc);

            fs.writeFileSync(outputPath, Buffer.from(audioBufferBase64, 'base64'));
        } else {
            throw new Error(`Unexpected TTS result type: ${result.type}`);
        }

        await browser.close();
        browser = null;

        // Get duration using ffmpeg
        let duration = 0;
        try {
            const { stdout } = await execAsync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`);
            duration = parseFloat(stdout.trim());
        } catch (e) {
            logger.error(`Error getting duration: ${e}`);
        }

        return { path: outputPath, duration };

    } catch (error) {
        if (browser) await browser.close();
        logger.error(`TTS Generation failed: ${error}`);
        throw error;
    }
}
