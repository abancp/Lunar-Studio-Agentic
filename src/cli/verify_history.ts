import { createLLM } from '../../llm/factory.js';
import { HistoryManager } from './history.js';
import { AGENTIC_SYSTEM_PROMPT } from '../../llm/system.js';
import * as config from './config.js';

async function verify() {
    testHistoryLogic();

    console.log("\nVerifying History Management with LLM...");

    // ... (rest of setup)
    // Ensure we have a provider. We'll use 'openai' or 'google' if keys exist, otherwise mock or error?
    // Let's assume the user has keys set up or we can find out. 
    // For this test, let's try 'google' as it's often freer/easier, or just check config.

    // Check config
    let provider = config.getProvider() || 'google'; // Default to google/gemini if not set
    let apiKey = config.getApiKey(provider);

    if (!apiKey) {
        console.warn(`No API key found for ${provider}. Please set it up via CLI or environment.`);
        // Try fallback to OpenAI if Google missing?
        if (provider === 'google') {
            provider = 'openai';
            apiKey = config.getApiKey(provider);
        }
    }

    if (!apiKey) {
        console.error("Unknown provider or missing API key. Skipping live LLM test.");
        // We can still test HistoryManager logic at least.
        testHistoryLogic();
        return;
    }

    console.log(`Using provider: ${provider}`);
    const llm = createLLM(provider, apiKey, 'default');
    const history = new HistoryManager(AGENTIC_SYSTEM_PROMPT);

    // 2. Test Conversation Flow
    console.log("\n--- Test 1: Context Retention ---");

    // User: "Hi, I am Antigravity."
    console.log("User: Hi, I am Antigravity.");
    history.addUserMessage("Hi, I am Antigravity.");

    let response = await llm.generate(history.getMessages());
    console.log(`AI: ${response.content}`);
    history.addMessage(response.role, response.content, response.tool_calls);

    // User: "What is my name?"
    console.log("User: What is my name?");
    history.addUserMessage("What is my name?");

    response = await llm.generate(history.getMessages());
    console.log(`AI: ${response.content}`);
    history.addMessage(response.role, response.content, response.tool_calls);

    if (response.content?.includes("Antigravity")) {
        console.log("SUCCESS: Context retained.");
    } else {
        console.warn("FAILURE: Context NOT retained (or LLM was evasive).");
    }

    // 3. Test Tool (Agentic) - using a simple tool if available
    // We didn't implement new tools, but 'tools/index.ts' exists. Let's see if we can trigger one.
    // If not, we skip tool test or mock it.
}

function testHistoryLogic() {
    console.log("\n--- Testing HistoryManager Logic Only ---");
    const h = new HistoryManager("System Prompt");
    h.addUserMessage("User 1");
    h.addAssistantMessage("Assistant 1");

    const msgs = h.getMessages();
    if (msgs.length === 3 && msgs[0]!.role === 'system' && msgs[1]!.content === "User 1") {
        console.log("HistoryManager Logic: PASS");
    } else {
        console.error("HistoryManager Logic: FAIL", msgs);
    }
}

verify().catch(console.error);
