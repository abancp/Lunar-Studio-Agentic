import { animationTool } from './tools/animation.js';
import * as config from './src/cli/config.js';
import dotenv from 'dotenv';

dotenv.config();

// Mock config if needed, or rely on .env
// We need to ensure provider is set.
// Assuming the user has run setup, config should be readable.

(async () => {
    try {
        console.log("Testing animation tool...");
        const prompt = process.argv[2] || "Say hello in 1 scene.";
        const result = await animationTool.execute({
            prompt: prompt
        });
        console.log("Result:", result);
    } catch (e) {
        console.error("Error:", e);
    }
})();
