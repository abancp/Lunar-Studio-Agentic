# Lunar Studio Agent Powers (Plugins)

Powers are external tool packages that you can install into your Lunar Studio Agent to give it new capabilities. Powers are standard npm packages that export an array of tools.

## Creating a Power

To create a new Power, start by creating a new npm package:

```bash
mkdir my-lunar-power
cd my-lunar-power
npm init -y
npm install zod
```

In your `index.js`, export an array of tools either as `tools` or as `default`.

```javascript
// index.js
const { z } = require('zod');

const myGreetingTool = {
    name: 'greet_user',
    description: 'Greets the user by name',
    schema: z.object({
        name: z.string().describe('The name of the user to greet'),
    }),
    execute: async ({ name }, context) => {
        return `Hello, \${name}! I am a custom power.`;
    }
};

module.exports = {
    tools: [myGreetingTool]
};
```

### Accessing Internal Tools

Your custom tool's `execute` function receives a second argument, `context`, which is the Agent's `ToolRegistry`. This allows your external power to execute internal tools or tools provided by other installed powers!

```javascript
const myAdvancedTool = {
    name: 'advanced_calculation',
    description: 'Verifies a complex expression',
    schema: z.object({
        expression: z.string().describe('Math expression'),
    }),
    execute: async ({ expression }, context) => {
        if (!context) return "No context available";
        
        // Execute another tool directly through the registry!
        // This is how powers can use "internal tools" like workspace manipulation or scheduling.
        try {
            const mathResult = await context.registry.executeTool('calculator', { expression });
            return `I used the internal calculator and got: ${mathResult}`;
        } catch (error) {
            return `Failed: ${error.message}`;
        }
    }
};
```

### Direct Messaging

If your tool produces a very large output (like a search result or a file) and you want to bypass the LLM summarizing it, you can use the `context.reply` hook to print data directly to the user interface (Terminal or WhatsApp) instantly:

```javascript
    execute: async ({ query }, context) => {
        const largeDataset = await fetchBigData(query);
        
        if (context && context.reply) {
            // This prints straight to WhatsApp / CLI Chat without the LLM reading it
            await context.reply(largeDataset);
            
            // Return a small message so the LLM doesn't repeat the huge dataset
            return "Data sent directly to user. Do not repeat.";
        }
        
        return largeDataset;
    }
```

## Installing Powers

You can install published npm packages or use local directories on your machine.

To install from npm:
```bash
lunarstudio power install super-cool-lunar-tools
```

To install a local package:
```bash
lunarstudio power install /path/to/my-lunar-power
```

## Managing Powers

List all installed powers:
```bash
lunarstudio power list
```

Remove a power:
```bash
lunarstudio power remove super-cool-lunar-tools
```
