
import { z } from 'zod';
import { Tool, Message } from '../llm/types.js';
import { createLLM } from '../llm/factory.js';
import * as config from '../src/cli/config.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../src/log.js';
import pptxgen from 'pptxgenjs';
// Handle both ESM and CJS interop
const PptxGenJS = (pptxgen as any).default || pptxgen;

const PRES_DIR = path.join(os.homedir(), 'lunarstudio', 'presentations');
if (!fs.existsSync(PRES_DIR)) fs.mkdirSync(PRES_DIR, { recursive: true });

interface SlideOutline {
    slide_number: number;
    title: string;
    goal: string;
}

interface SlideContent {
    title: string;
    subtitle?: string;
    bullets: string[];
    speaker_notes?: string;
    visuals?: {
        backgroundColor?: string; // Hex code e.g. "FFFFFF"
        textColor?: string;       // Hex code e.g. "000000"
        borderColor?: string;     // Hex code e.g. "003366"
        diagram?: {
            type: 'process' | 'cycle' | 'list' | 'timeline';
            steps: string[];
        };
    };
}

const OUTLINE_SYSTEM_PROMPT = `You are a presentation expert. 
Create an outline for a presentation based on the user's request.
Return a JSON array of objects with keys: slide_number, title, goal.
Ensure a logical flow.
`;

const CONTENT_SYSTEM_PROMPT = `You are a presentation content generator.
Given a slide title and goal, generate detailed content for that single slide.
Return a JSON object with keys: title, subtitle (optional), bullets (array of strings), speaker_notes (optional).
Also include a "visuals" object with:
- backgroundColor: Hex code for slide background (e.g. "F0F8FF").
- textColor: Hex code for text (e.g. "333333").
- borderColor: Hex code for a slide border (optional).
- diagram: (Optional) object with "type" ("process", "cycle", "list", "timeline") and "steps" (array of strings) if the content suits a diagram.
Keep bullets concise and punchy.
`;

async function generateOutline(prompt: string): Promise<SlideOutline[]> {
    const providerName = config.getProvider();
    const apiKey = providerName ? config.getApiKey(providerName) : undefined;
    if (!providerName || !apiKey) throw new Error('LLM provider not configured.');

    const model = config.getDefaultModel(providerName);
    const llm = createLLM(providerName, apiKey, model);

    const messages: Message[] = [
        { role: 'system', content: OUTLINE_SYSTEM_PROMPT },
        { role: 'user', content: `Create a presentation outline for: "${prompt}". Return ONLY JSON.` }
    ];

    const response = await llm.generate(messages);
    try {
        const content = (response.content || '').replace(/```json\n?|\n?```/g, '').trim();
        const json = JSON.parse(content);
        return Array.isArray(json) ? json : json.slides || [];
    } catch (e) {
        logger.error(`Failed to parse outline JSON: ${e}`);
        throw new Error("Failed to generate presentation outline.");
    }
}

async function generateSlideContent(slide: SlideOutline, overallTopic: string): Promise<SlideContent> {
    const providerName = config.getProvider();
    const apiKey = providerName ? config.getApiKey(providerName) : undefined;
    if (!providerName || !apiKey) throw new Error('LLM provider not configured.');
    const model = config.getDefaultModel(providerName);
    const llm = createLLM(providerName, apiKey, model);

    const messages: Message[] = [
        { role: 'system', content: CONTENT_SYSTEM_PROMPT },
        { role: 'user', content: `Topic: ${overallTopic}\nSlide Title: ${slide.title}\nGoal: ${slide.goal}\n\nGenerate content for this slide. Return ONLY JSON.` }
    ];

    const response = await llm.generate(messages);
    try {
        const content = (response.content || '').replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(content);
    } catch (e) {
        logger.error(`Failed to parse slide content JSON for slide ${slide.slide_number}: ${e}`);
        // Fallback
        return {
            title: slide.title,
            bullets: ["Content generation failed for this slide."],
            speaker_notes: "Error generating content."
        };
    }
}

function renderDiagram(slide: any, type: string, steps: string[], PptxGenJS: any) {
    // PptxGenJS v3.12+ supports string literals for shapes, so we use those to avoid access issues
    const colors = ['4472C4', 'ED7D31', 'A5A5A5', 'FFC000', '5B9BD5', '70AD47'];

    if (type === 'process') {
        const w = 8.5 / steps.length;
        const h = 0.8;
        steps.forEach((step, i) => {
            const x = 0.5 + (i * (w + 0.1));
            slide.addShape('rightArrow', {
                x: x, y: 3.0, w: w, h: h,
                fill: { color: colors[i % colors.length] },
                align: 'center'
            });
            slide.addText(step, { x: x, y: 3.0, w: w, h: h, fontSize: 13, color: 'FFFFFF', align: 'center', bold: true });
        });
    } else if (type === 'cycle') {
        // Simple circle cycle
        const cx = 5.0;
        const cy = 4.0;
        const radius = 1.5;
        const angleStep = (2 * Math.PI) / steps.length;

        steps.forEach((step, i) => {
            const angle = i * angleStep - (Math.PI / 2); // Start at top
            const x = cx + radius * Math.cos(angle) - 0.75;
            const y = cy + radius * Math.sin(angle) - 0.5;

            slide.addShape('ellipse', {
                x: x, y: y, w: 1.5, h: 1.0,
                fill: { color: colors[i % colors.length] }
            });
            slide.addText(step, { x: x, y: y, w: 1.5, h: 1.0, fontSize: 12, color: 'FFFFFF', align: 'center', bold: true });
        });

    } else if (type === 'timeline') {
        // Horizontal line
        slide.addShape('line', { x: 1.0, y: 4.0, w: 8.0, h: 0, line: { color: '333333', width: 2 } });

        const w = 8.0 / steps.length;
        steps.forEach((step, i) => {
            const x = 1.0 + (i * w) + (w / 2);
            // Node
            slide.addShape('ellipse', { x: x - 0.15, y: 3.85, w: 0.3, h: 0.3, fill: { color: colors[i % colors.length] } });
            // Text below
            slide.addText(step, { x: x - 0.75, y: 4.2, w: 1.5, h: 1.0, fontSize: 10, align: 'center', color: '333333' });
        });
    } else {
        // List (default or 'list')
        const h = 4.0 / steps.length;
        steps.forEach((step, i) => {
            slide.addShape('rect', {
                x: 0.5, y: 2.0 + (i * (h + 0.1)), w: 9.0, h: h,
                fill: { color: colors[i % colors.length], transparency: 50 },
                line: { color: colors[i % colors.length], width: 2 }
            });
            slide.addText(step, {
                x: 0.6, y: 2.0 + (i * (h + 0.1)), w: 8.8, h: h,
                fontSize: 16, color: '000000', align: 'left', valign: 'middle'
            });
        });
    }
}

async function renderPresentation(slides: SlideContent[], filename: string): Promise<string> {
    const pres = new (PptxGenJS as any)();

    // Set Layout
    pres.layout = 'LAYOUT_16x9';

    // Title Slide
    if (slides.length > 0) {
        const titleSlide = slides[0];
        if (titleSlide) {
            const slide = pres.addSlide();

            // Visuals: Background
            if (titleSlide.visuals?.backgroundColor) {
                slide.background = { color: titleSlide.visuals.backgroundColor };
            }
            const textColor = titleSlide.visuals?.textColor || '000000';

            slide.addText(titleSlide.title || 'Untitled', { x: 1, y: 1, w: '80%', h: 1, fontSize: 36, align: 'center', bold: true, color: textColor });
            if (titleSlide.subtitle) {
                slide.addText(titleSlide.subtitle, { x: 1, y: 2.5, w: '80%', h: 1, fontSize: 24, align: 'center', color: '363636' });
            }

            // Border
            if (titleSlide.visuals?.borderColor) {
                slide.addShape('rect', { x: 0.2, y: 0.2, w: '96%', h: '93%', fill: { type: 'none' }, line: { color: titleSlide.visuals.borderColor, width: 3 } });
            }
        }
    }

    // Content Slides (skip first if it was title)
    for (let i = 1; i < slides.length; i++) {
        const content = slides[i];
        if (!content) continue;

        const slide = pres.addSlide();

        // Visuals: Background
        if (content.visuals?.backgroundColor) {
            slide.background = { color: content.visuals.backgroundColor };
        }
        const textColor = content.visuals?.textColor || '003366';

        // Border
        if (content.visuals?.borderColor) {
            slide.addShape('rect', { x: 0.2, y: 0.2, w: '96%', h: '93%', fill: { type: 'none' }, line: { color: content.visuals.borderColor, width: 3 } });
        }

        // Title
        slide.addText(content.title || 'Untitled', { x: 0.5, y: 0.5, w: '90%', h: 0.8, fontSize: 32, bold: true, color: textColor });

        // Subtitle
        if (content.subtitle) {
            slide.addText(content.subtitle, { x: 0.5, y: 1.3, w: '90%', h: 0.5, fontSize: 18, color: '666666', italic: true });
        }

        // Diagram OR Bullets
        if (content.visuals?.diagram && content.visuals.diagram.steps.length > 0) {
            // Render Diagram
            renderDiagram(slide, content.visuals.diagram.type, content.visuals.diagram.steps, PptxGenJS);
        } else {
            // Bullets (Default)
            if (content.bullets && content.bullets.length > 0) {
                const bulletItems = content.bullets.map(b => ({ text: b, options: { fontSize: 18, breakLine: true } }));
                slide.addText(bulletItems, { x: 0.5, y: 2.0, w: '90%', h: 4.5, color: '333333', bullet: true });
            }
        }

        // Notes
        if (content.speaker_notes) {
            slide.addNotes(content.speaker_notes);
        }
    }

    const filePath = path.join(PRES_DIR, filename);
    await pres.writeFile({ fileName: filePath });
    return filePath;
}

export const presentationTool: Tool = {
    name: 'generate_presentation',
    description: 'Generate a PowerPoint presentation (.pptx) based on a topic. Returns the file path.',
    schema: z.object({
        topic: z.string().describe('The topic of the presentation'),
        numSlides: z.number().optional().describe('Approximate number of slides (default: 5)'),
    }),
    execute: async ({ topic, numSlides = 5 }) => {
        try {
            logger.info(`Starting presentation generation for: ${topic}`);

            // 1. Outline
            logger.info("Generating outline...");
            let outline = await generateOutline(`${topic}. Target around ${numSlides} slides.`);

            // Limit slides if LLM went crazy
            if (outline.length > 15) outline = outline.slice(0, 15);

            logger.info(`Generated outline with ${outline.length} slides.`);

            // 2. Content Generation (Parallel requests could be faster, but let's do sequential for reliability first)
            const slidesContent: SlideContent[] = [];
            for (const slide of outline) {
                logger.info(`Generating content for slide ${slide.slide_number}: ${slide.title}`);
                const content = await generateSlideContent(slide, topic);
                slidesContent.push(content);
            }

            // 3. Render
            logger.info("Rendering presentation...");
            const safeTopic = topic.replace(/[^a-z0-9]/gi, '_').substring(0, 20);
            const filename = `${safeTopic}_${uuidv4().slice(0, 8)}.pptx`;
            const filePath = await renderPresentation(slidesContent, filename);

            logger.info(`Presentation saved to: ${filePath}`);
            return `Presentation generated successfully!\nFile: ${filePath}\nYou can use send_file to share it.`;

        } catch (error: any) {
            logger.error(`Presentation generation failed: ${error.message}`);
            return `Error generating presentation: ${error.message}`;
        }
    }
};
