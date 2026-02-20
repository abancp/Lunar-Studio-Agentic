
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../src/log.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as config from '../src/cli/config.js';

const execAsync = promisify(exec);
const TTS_DIR = path.join(os.homedir(), 'lunarstudio', 'tts_cache');

if (!fs.existsSync(TTS_DIR)) {
    fs.mkdirSync(TTS_DIR, { recursive: true });
}

export async function generateTTS(text: string): Promise<{ path: string; duration: number }> {
    const apiKey = config.getApiKey('openai');
    if (!apiKey) throw new Error("OpenAI API Key not found for TTS.");

    const openai = new OpenAI({ apiKey });

    const id = uuidv4();
    const outputPath = path.join(TTS_DIR, `tts_${id}.mp3`);

    logger.info(`Generating OpenAI TTS for: "${text.substring(0, 20)}..."`);

    try {
        const mp3 = await openai.audio.speech.create({
            model: "tts-1",
            voice: "alloy",
            input: text,
        });

        const buffer = Buffer.from(await mp3.arrayBuffer());
        await fs.promises.writeFile(outputPath, buffer);

        // Get duration using ffmpeg
        let duration = 0;
        try {
            const { stdout } = await execAsync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`);
            duration = parseFloat(stdout.trim());
        } catch (e) {
            logger.error(`Error getting duration: ${e}`);
            // Fallback duration estimation: roughly 15 chars per second for English speech?
            // Or just default to 5s if unknown.
            duration = Math.max(5, text.length / 15);
        }

        return { path: outputPath, duration };

    } catch (error) {
        logger.error(`OpenAI TTS Generation failed: ${error}`);
        throw error;
    }
}
