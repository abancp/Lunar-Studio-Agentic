import { z } from 'zod';
import { Tool, Message } from '../llm/types.js';
import { createLLM } from '../llm/factory.js';
import * as config from '../src/cli/config.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../src/log.js';
import { generateTTS } from './google_tts.js';

const execAsync = promisify(exec);

const ANIMATION_DIR = path.join(os.homedir(), 'lunarstudio', 'animations');
const TEMP_DIR = path.join(os.homedir(), 'lunarstudio', 'animations', 'temp');
const LOG_FILE = path.join(ANIMATION_DIR, 'animation.log');
const VENV_MANIM = path.join(os.homedir(), 'lunarstudio', '.workspace', 'venv', 'bin', 'manim');

if (!fs.existsSync(ANIMATION_DIR)) fs.mkdirSync(ANIMATION_DIR, { recursive: true });
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

function logAnimation(message: string) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, logLine);
    logger.info(message);
}

interface Scene {
    id: number;
    title: string;
    description: string;
    visual_code_prompt: string;
    narration: string;
}

const SCENE_GEN_SYSTEM_PROMPT = `You are an expert animation director. 
Your goal is to break down a user's request into a sequence of scenes for a video.
Each scene must have:
- title: Short title
- description: What happens in this scene
- visual_code_prompt: A very specific description for a Manim programmer to write python code. 
  - Mention specific shapes, colors (LIGHT THEME: use black/dark-blue text on white background), and motions. 
  - Do NOT write code here, just the prompt for the coder.
  - IMPORTANT: The animation MUST end with a 'wait' command to sync with audio.
- narration: The exact text to be spoken by the TTS voice.
`;

const MANIM_SYSTEM_PROMPT = `You are a Manim animation generator. You ONLY output valid Python code using the Manim library.

RULES:
- Import everything: from manim import *
- Define a single class inheriting from Scene (e.g., class GenScene(Scene):)
- In the construct method, write the animation logic.
- Use a WHITE background (self.camera.background_color = WHITE).
- Use DARK colors for objects/text so they are visible (BLACK, BLUE, RED, etc).
- The animation needs to be exactly {DURATION} seconds long.
- The animation needs to be exactly {DURATION} seconds long.
- Calculate timing so that animations finish and then 'self.wait()' fills the rest.
- Text should be clear and large enough.
- Output ONLY the raw Python code, no \`\`\` markers.
- Name the class 'GenScene'.
- IMPORTANT: DO NOT use 'SVGMobject', 'ImageMobject', or any external files. Use ONLY built-in Manim shapes (Circle, Square, Rectangle, etc) and Text.
`;

async function generateScenes(prompt: string): Promise<Scene[]> {
    const providerName = config.getProvider();
    const apiKey = config.getApiKey(providerName!);
    if (!providerName || !apiKey) throw new Error('LLM provider not configured.');

    const model = config.getDefaultModel(providerName);
    const llm = createLLM(providerName, apiKey, model);

    const messages: Message[] = [
        { role: 'system', content: SCENE_GEN_SYSTEM_PROMPT },
        { role: 'user', content: `Create a video plan for: "${prompt}". Return a JSON array of objects with keys: id, title, description, visual_code_prompt, narration.` }
    ];

    const response = await llm.generate(messages);

    // Parse JSON
    try {
        const content = (response.content || '').replace(/```json\n?|\n?```/g, '').trim();
        const json = JSON.parse(content);
        return Array.isArray(json) ? json : json.scenes || [];
    } catch (e) {
        logger.error(`Failed to parse scene JSON: ${e}`);
        throw new Error("Failed to generate scenes plan.");
    }
}

async function generateManimCode(prompt: string, duration: number, previousError?: string): Promise<string> {
    const providerName = config.getProvider();
    const apiKey = config.getApiKey(providerName!);
    if (!providerName || !apiKey) throw new Error('LLM provider not configured.');
    const model = config.getDefaultModel(providerName);
    const llm = createLLM(providerName, apiKey, model);

    let userContent = `Create a Manim animation for: "${prompt}". Duration: ${duration}s.\nOutput ONLY valid Python code.`;
    if (previousError) {
        userContent += `\n\nPREVIOUS CODE FAILED WITH ERROR:\n${previousError}\n\nFIX THE CODE. DO NOT USE EXTERNAL ASSETS.`;
    }

    const messages: Message[] = [
        { role: 'system', content: MANIM_SYSTEM_PROMPT.replace('{DURATION}', duration.toFixed(1)) },
        { role: 'user', content: userContent }
    ];

    const response = await llm.generate(messages);
    return (response.content || '').replace(/^```python\n?/m, '').replace(/^```\n?/m, '').replace(/```$/m, '').trim();
}

async function mergeAudioVideo(videoPath: string, audioPath: string, outputPath: string): Promise<void> {
    // Merge command: ffmpeg -i video -i audio -c:v copy -c:a aac -shortest output.mp4
    // We might need to loop video if audio is longer, or cut audio. 
    // Ideally Manim made video long enough.
    // We'll pad video with last frame if needed.
    // ffmpeg -i video.mp4 -i audio.mp3 -filter_complex "[0:v]tpad=stop_mode=clone:stop_duration=2[v]" -map "[v]" -map 1:a -shortest output.mp4
    // Simple merge for now:
    const cmd = `ffmpeg -y -i "${videoPath}" -i "${audioPath}" -c:v copy -c:a aac -shortest "${outputPath}"`;
    await execAsync(cmd);
}

async function concatVideos(videoPaths: string[], outputPath: string): Promise<void> {
    const listPath = path.join(TEMP_DIR, `concat_${uuidv4()}.txt`);
    const fileContent = videoPaths.map(p => `file '${p}'`).join('\n');
    fs.writeFileSync(listPath, fileContent);

    // Concat
    const tempOutput = path.join(TEMP_DIR, `concat_temp_${uuidv4()}.mp4`);
    await execAsync(`ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${tempOutput}"`);

    // Add Watermark: "lunarstudio - video (beta)" Bottom Right
    // text=...:x=w-tw-10:y=h-th-10
    const watermarkCmd = `ffmpeg -y -i "${tempOutput}" -vf "drawtext=text='lunarstudio - video (beta)':fontcolor=black:fontsize=24:x=w-tw-10:y=h-th-10:box=1:boxcolor=white@0.5:boxborderw=2" -c:a copy "${outputPath}"`;

    await execAsync(watermarkCmd);

    fs.unlinkSync(listPath);
    fs.unlinkSync(tempOutput);
}

export const animationTool: Tool = {
    name: 'generate_animation',
    description: 'Generate a narrated, scene-based animation video using Manim and TTS. Returns path to mp4.',
    schema: z.object({
        prompt: z.string().describe('Content of the animation video'),
    }),
    execute: async ({ prompt }) => {
        try {
            logAnimation(`Starting animation generation for: ${prompt}`);

            // 1. Plan Scenes
            const scenes = await generateScenes(prompt);
            logAnimation(`Generated ${scenes.length} scenes.`);

            const sceneVideoPaths: string[] = [];

            for (const scene of scenes) {
                logAnimation(`Processing scene ${scene.id}: ${scene.title}`);
                const id = uuidv4().slice(0, 8);
                let sceneSuccess = false;
                let lastError = undefined;
                let duration = 5.0; // Default for fallback access scope
                let ttsInfo = { path: '', duration: 0 }; // Scope for fallback

                for (let attempt = 1; attempt <= 3; attempt++) {
                    try {
                        if (attempt > 1) logAnimation(`Retry attempt ${attempt} for scene ${scene.id}...`);

                        // 2. Generate Audio
                        const ttsInfo = await generateTTS(scene.narration);
                        // If duration is 0, we need to find it.
                        if (ttsInfo.duration === 0) {
                            // Check with ffprobe if tts helper didn't
                            try {
                                const { stdout } = await execAsync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${ttsInfo.path}"`);
                                ttsInfo.duration = parseFloat(stdout.trim()) || 5;
                            } catch { ttsInfo.duration = 5; } // Fallback
                        }
                        logAnimation(`TTS duration for scene ${scene.id}: ${ttsInfo.duration}s`);

                        // Add a small buffer to duration
                        const duration = ttsInfo.duration + 1.0;

                        // 3. Generate Manim Video
                        logAnimation(`Generating Manim code for scene ${scene.id}...`);
                        const code = await generateManimCode(scene.visual_code_prompt, duration, lastError);
                        const scriptPath = path.join(TEMP_DIR, `scene_${id}.py`);
                        fs.writeFileSync(scriptPath, code);

                        const manimCmd = fs.existsSync(VENV_MANIM) ? VENV_MANIM : 'manim';
                        // Use 720p for speed
                        logAnimation(`Rendering Manim scene ${scene.id}...`);
                        await execAsync(`${manimCmd} -qm --disable_caching --verbosity ERROR "${scriptPath}" GenScene`, { cwd: TEMP_DIR, timeout: 120000 });

                        // Find output
                        const videoDir = path.join(TEMP_DIR, 'media', 'videos', `scene_${id}`, '720p30');
                        const rawVideoPath = path.join(videoDir, 'GenScene.mp4');

                        if (!fs.existsSync(rawVideoPath)) {
                            throw new Error(`Failed to render scene ${scene.id}`);
                        }

                        // 4. Merge Audio and Video
                        logAnimation(`Merging audio and video for scene ${scene.id}...`);
                        const mergedPath = path.join(TEMP_DIR, `merged_${id}.mp4`);
                        await mergeAudioVideo(rawVideoPath, ttsInfo.path, mergedPath);

                        sceneVideoPaths.push(mergedPath);
                        sceneSuccess = true;
                        break; // Success, exit retry loop

                    } catch (error: any) {
                        logAnimation(`Error in scene ${scene.id} (attempt ${attempt}): ${error.message}`);
                        lastError = error.message;
                        if (attempt === 3) {
                            logAnimation(`Failed to process scene ${scene.id} after 3 attempts. Generating FALLBACK scene.`);
                            // Fallback: Generate a simple video with just the TTS audio and a static text
                            // We can't easily generate a video without Manim if Manim is broken, 
                            // BUT if the error is "Manim code invalid", we can try to generate a *very simple* Manim code 
                            // that we KNOW works.
                            try {
                                const fallbackCode = `
from manim import *
class GenScene(Scene):
    def construct(self):
        self.camera.background_color = WHITE
        text = Text("Scene ${scene.id}: Generation Failed", color=RED).scale(0.8)
        self.add(text)
        self.wait(${duration})
`;
                                const fallbackScriptPath = path.join(TEMP_DIR, `scene_${id}_fallback.py`);
                                fs.writeFileSync(fallbackScriptPath, fallbackCode);

                                const manimCmd = fs.existsSync(VENV_MANIM) ? VENV_MANIM : 'manim';
                                await execAsync(`${manimCmd} -qm --disable_caching --verbosity ERROR "${fallbackScriptPath}" GenScene`, { cwd: TEMP_DIR, timeout: 60000 });

                                const videoDir = path.join(TEMP_DIR, 'media', 'videos', `scene_${id}_fallback`, '720p30');
                                const rawVideoPath = path.join(videoDir, 'GenScene.mp4');

                                const mergedPath = path.join(TEMP_DIR, `merged_${id}.mp4`);
                                // Ensure TTS exists (it might have failed there too)
                                if (!fs.existsSync(ttsInfo.path)) {
                                    // If TTS failed, we can't do much. Pass.
                                    throw new Error("TTS failed even for fallback.");
                                }
                                await mergeAudioVideo(rawVideoPath, ttsInfo.path, mergedPath);
                                sceneVideoPaths.push(mergedPath);
                                sceneSuccess = true; // Mark as success so we continue

                            } catch (fallbackError: any) {
                                logAnimation(`Critical: Fallback generation also failed: ${fallbackError.message}`);
                                // If fallback fails, we must skip this scene to save the rest of the video
                                // We won't add to sceneVideoPaths
                            }
                        } else {
                            await new Promise(r => setTimeout(r, 2000)); // Wait before retry
                        }
                    }
                } // end retry loop
            }

            // 5. Concat all scenes
            logAnimation(`Concatenating ${sceneVideoPaths.length} scenes...`);
            const finalId = uuidv4().slice(0, 8);
            const finalPath = path.join(ANIMATION_DIR, `animation_${finalId}.mp4`);

            await concatVideos(sceneVideoPaths, finalPath);

            logAnimation(`Animation complete: ${finalPath}`);
            return `Animation generated!\nFile: ${finalPath}\nYou can use send_file to share it.`;

        } catch (error: any) {
            logAnimation(`Animation generation failed: ${error}`);
            // logger.error already called in logAnimation if I change it, but currently logAnimation calls logger.info.
            // Let's rely on logAnimation for file log and logger.error for console/system log.
            logger.error(`Animation generation failed: ${error}`);
            return `Error generating animation: ${error.message}`;
        }
    }
};
