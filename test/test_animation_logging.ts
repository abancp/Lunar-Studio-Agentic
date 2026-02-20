
import { animationTool } from '../tools/animation.js';
import { logger } from '../src/log.js';

// Mock logger to verify calls
const originalInfo = logger.info;
const originalError = logger.error;

logger.info = (msg: string) => {
    console.log(`[ captured info ] ${msg}`);
    originalInfo.call(logger, msg);
};

logger.error = (msg: string) => {
    console.error(`[ captured error ] ${msg}`);
    originalError.call(logger, msg);
};

async function test() {
    console.log('Testing animation tool logging...');
    // We expect this to fail if manim is not installed or if LLM fails, but we want to see the error log.
    // Or we can mock the internal generation to skip LLM cost and just test the logging path?
    // For now, let's just run it. If it fails, we catch the error log.

    // Using a simple prompt
    const prompt = "A circle";

    // We can't easily mock the tool's internals without DI.
    // But we know we added logger.info and logger.error.

    try {
        const result = await animationTool.execute({ prompt });
        console.log('Result:', result);
    } catch (e) {
        console.error('Execution failed:', e);
    }
}

test();
