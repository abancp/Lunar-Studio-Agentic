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

const DIAGRAM_DIR = path.join(os.homedir(), 'lunarstudio', 'diagrams');

const DIAGRAM_SYSTEM_PROMPT = `You are a Python diagram generator. You ONLY output valid Python code, nothing else.

RULES:
- Use matplotlib for charts, graphs, plots.
- Use diagrams library (from diagrams import *) for architecture/infra diagrams.
- Use networkx + matplotlib for flow charts and network graphs.
- Use pillow for simple image generation.
- The code MUST save the result as a PNG image.
- The output file path will be provided as OUTPUT_PATH variable — use it exactly.
- Do NOT use plt.show() — only save to file.
- Do NOT print anything except the output path at the very end: print(OUTPUT_PATH)
- Do NOT include any markdown, explanation, or comments outside the code.
- Output ONLY the raw Python code, no \`\`\` markers.
- Make the diagram visually clean and professional with good colors.
- Use a white or light background.
- Set figure DPI to 150 for good quality.
- Handle imports gracefully — if a library isn't available, fall back to matplotlib.`;

/**
 * Use a separate LLM context to generate Python code for the diagram.
 * This is completely isolated from the main conversation context.
 */
async function generatePythonCode(prompt: string, outputPath: string): Promise<string> {
    const providerName = config.getProvider();
    const apiKey = config.getApiKey(providerName!);

    if (!providerName || !apiKey) {
        throw new Error('LLM provider not configured. Run lunarstudio setup first.');
    }

    const model = config.getDefaultModel(providerName);
    const llm = createLLM(providerName, apiKey, model);

    // Isolated context — never touches main conversation
    const messages: Message[] = [
        { role: 'system', content: DIAGRAM_SYSTEM_PROMPT },
        {
            role: 'user',
            content: `Generate a Python script to create this diagram:\n\n${prompt}\n\nSave the output image to: OUTPUT_PATH = "${outputPath}"\n\nOutput ONLY the Python code.`,
        },
    ];

    const response = await llm.generate(messages);
    let code = response.content || '';

    // Strip markdown code fences if the LLM wraps it
    code = code.replace(/^```python\n?/m, '').replace(/^```\n?/m, '').replace(/```$/m, '').trim();

    return code;
}

export const diagramTool: Tool = {
    name: 'generate_diagram',
    description:
        'Generate a diagram/chart/graph image from a text description. Uses Python (matplotlib, networkx, diagrams, pillow) to create professional visualizations. Returns the absolute path to the generated PNG image. Use send_file tool afterward to share it.',
    schema: z.object({
        prompt: z.string().describe('Description of the diagram to generate, e.g. "pie chart of browser market share" or "AWS architecture with EC2, S3, and RDS"'),
    }),
    execute: async ({ prompt }: { prompt: string }) => {
        try {
            // Ensure output directory exists
            if (!fs.existsSync(DIAGRAM_DIR)) {
                fs.mkdirSync(DIAGRAM_DIR, { recursive: true });
            }

            const fileName = `diagram_${uuidv4().slice(0, 8)}.png`;
            const outputPath = path.join(DIAGRAM_DIR, fileName);

            // Step 1: Generate Python code using isolated LLM context
            const pythonCode = await generatePythonCode(prompt, outputPath);

            // Step 2: Write Python script to temp file
            const scriptPath = path.join(DIAGRAM_DIR, `_temp_${uuidv4().slice(0, 8)}.py`);
            fs.writeFileSync(scriptPath, pythonCode, 'utf-8');

            // Step 3: Execute the Python script
            try {
                const { stdout, stderr } = await execAsync(`python3 "${scriptPath}"`, {
                    timeout: 30000, // 30s timeout
                    cwd: DIAGRAM_DIR,
                });

                if (stderr && !stderr.includes('UserWarning')) {
                    // Some warnings are normal (matplotlib backend etc), only log real errors
                    console.error('Python stderr:', stderr);
                }
            } catch (execError: any) {
                // Clean up temp script
                if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);

                // If first attempt fails, try once more with a simpler prompt
                const retryCode = await generatePythonCode(
                    `${prompt}\n\nIMPORTANT: Use ONLY matplotlib (no external libraries). Keep it simple.`,
                    outputPath
                );
                fs.writeFileSync(scriptPath, retryCode, 'utf-8');

                try {
                    await execAsync(`python3 "${scriptPath}"`, {
                        timeout: 30000,
                        cwd: DIAGRAM_DIR,
                    });
                } catch (retryError: any) {
                    if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
                    return `Error generating diagram: ${retryError.message}\n${retryError.stderr || ''}`;
                }
            }

            // Clean up temp script
            if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);

            // Verify output exists
            if (!fs.existsSync(outputPath)) {
                return `Error: Diagram was generated but output file not found at ${outputPath}`;
            }

            return `Diagram generated successfully!\nFile: ${outputPath}\n\nUse the send_file tool to send this image to the user.`;
        } catch (error: any) {
            return `Error generating diagram: ${error.message}`;
        }
    },
};
