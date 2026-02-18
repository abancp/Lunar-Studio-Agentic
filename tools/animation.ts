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

const execAsync = promisify(exec);

const ANIMATION_DIR = path.join(os.homedir(), 'lunarstudio', 'animations');
const VENV_Py = path.join(os.homedir(), 'lunarstudio', '.workspace', 'venv', 'bin', 'python3');
const VENV_MANIM = path.join(os.homedir(), 'lunarstudio', '.workspace', 'venv', 'bin', 'manim');

const MANIM_SYSTEM_PROMPT = `You are a Manim animation generator. You ONLY output valid Python code using the Manim library.

RULES:
- Import everything: from manim import *
- Define a single class inheriting from Scene (e.g., class Animation(Scene):)
- In the construct method, write the animation logic.
- Use simple, clear animations (Write, FadeIn, Transform, etc).
- Keep it short (5-10 seconds max unless requested otherwise).
- Use proper colors and positioning.
- Do NOT use interactive features (like scene.wait_until_input).
- Output ONLY the raw Python code, no \`\`\` markers.
- Do NOT include any explanations or markdown.
- Ensure the class name is 'GenScene'.
`;

/**
 * Generate Manim code using isolated LLM context.
 */
async function generateManimCode(prompt: string): Promise<string> {
    const providerName = config.getProvider();
    const apiKey = config.getApiKey(providerName!);

    if (!providerName || !apiKey) {
        throw new Error('LLM provider not configured.');
    }

    const model = config.getDefaultModel(providerName);
    const llm = createLLM(providerName, apiKey, model);

    const messages: Message[] = [
        { role: 'system', content: MANIM_SYSTEM_PROMPT },
        {
            role: 'user',
            content: `Create a Manim animation for: "${prompt}".\nName the class 'GenScene'.\nOutput ONLY valid Python code.`,
        },
    ];

    const response = await llm.generate(messages);
    let code = response.content || '';

    // Strip markdown
    code = code.replace(/^```python\n?/m, '').replace(/^```\n?/m, '').replace(/```$/m, '').trim();

    return code;
}

export const animationTool: Tool = {
    name: 'generate_animation',
    description: 'Generate a short video animation using Manim (Math Animation Engine). Good for math explanations, dynamic text, or simple motion graphics. Returns the path to the .mp4 file.',
    schema: z.object({
        prompt: z.string().describe('Description of the animation to create, e.g. "A circle transforming into a square with text"'),
    }),
    execute: async ({ prompt }: { prompt: string }) => {
        try {
            if (!fs.existsSync(ANIMATION_DIR)) {
                fs.mkdirSync(ANIMATION_DIR, { recursive: true });
            }

            // Check if manim is available
            const useVenv = fs.existsSync(VENV_MANIM);
            const manimCmd = useVenv ? VENV_MANIM : 'manim';

            // Step 1: Generate Code
            const code = await generateManimCode(prompt);

            const id = uuidv4().slice(0, 8);
            const scriptPath = path.join(ANIMATION_DIR, `anim_${id}.py`);
            fs.writeFileSync(scriptPath, code, 'utf-8');

            // Step 2: Render
            // manim -qm (quality medium) -o (output name) --media_dir (dir) script.py SceneName
            // Note: manim outputs to media_dir/videos/script_name/quality/scene.mp4
            // We want to simplify this.

            // We'll use default output structure but find the file after.
            // Command: manim -qm --disable_caching --verbosity ERROR script.py GenScene

            const cmd = `${manimCmd} -qm --disable_caching --verbosity ERROR "${scriptPath}" GenScene`;

            try {
                // Execute in ANIMATION_DIR so media folder is created there
                await execAsync(cmd, { cwd: ANIMATION_DIR, timeout: 60000 }); // 60s timeout
            } catch (e: any) {
                // Return stdout/stderr for debugging if it failed
                return `Error rendering animation: ${e.message}\nStderr: ${e.stderr}`;
            }

            // Find the output file
            // Default: ANIMATION_DIR/media/videos/anim_<id>/720p30/GenScene.mp4
            const videoDir = path.join(ANIMATION_DIR, 'media', 'videos', `anim_${id}`, '720p30');
            const videoPath = path.join(videoDir, 'GenScene.mp4');

            if (fs.existsSync(videoPath)) {
                // Move to top level for simplicity and return
                const finalPath = path.join(ANIMATION_DIR, `animation_${id}.mp4`);
                fs.renameSync(videoPath, finalPath);

                // Cleanup media folder if desired, or keep for cache.
                // We'll leave it for now or delete the temp script.
                fs.unlinkSync(scriptPath);
                // fs.rmSync(path.join(ANIMATION_DIR, 'media'), { recursive: true, force: true }); 

                return `Animation generated successfully!\nFile: ${finalPath}\n\nUse send_file to share it.`;
            } else {
                return `Error: Animation rendered but file not found at expected path: ${videoPath}`;
            }

        } catch (error: any) {
            return `Error generating animation: ${error.message}`;
        }
    }
};
