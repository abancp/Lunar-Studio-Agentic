
import * as googleTTS from 'google-tts-api';
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

    logger.info(`Generating Google TTS for: "${text.substring(0, 20)}..."`);

    try {
        // google-tts-api has a limit of 200 chars. We might need to split.
        // For now, let's assume short text or just take the first 200 chars if long.
        // Actually, we should split and concat.

        // Simple splitter
        const chunks = text.match(/.{1,200}/g) || [text];

        const audioBuffers: Buffer[] = [];

        for (const chunk of chunks) {
            const url = googleTTS.getAudioUrl(chunk, {
                lang: 'en',
                slow: false,
                host: 'https://translate.google.com',
            });
            logger.info(`Fetching TTS URL: ${url}`);

            let response;
            for (let i = 0; i < 3; i++) {
                try {
                    response = await fetch(url);
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    break;
                } catch (e) {
                    if (i === 2) throw e;
                    logger.warn(`TTS fetch failed (attempt ${i + 1}): ${e}. Retrying...`);
                    await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Exponential backoff
                }
            }

            if (!response) throw new Error("TTS fetch failed after retries.");

            const arrayBuffer = await response.arrayBuffer();
            audioBuffers.push(Buffer.from(arrayBuffer));
        }

        const finalBuffer = Buffer.concat(audioBuffers);
        await fs.promises.writeFile(outputPath, finalBuffer);

        // Get duration using ffmpeg
        let duration = 0;
        try {
            const { stdout } = await execAsync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`);
            duration = parseFloat(stdout.trim());
        } catch (e) {
            logger.error(`Error getting duration: ${e}`);
            duration = Math.max(5, text.length / 15);
        }

        return { path: outputPath, duration };

    } catch (error) {
        logger.error(`Google TTS Generation failed: ${error}`);
        throw error;
    }
}
