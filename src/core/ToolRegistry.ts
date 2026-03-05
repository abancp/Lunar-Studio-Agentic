import { Tool } from '../../llm/types.js';
import { tools as internalTools } from '../../tools/index.js';

export class ToolRegistry {
    private tools: Map<string, Tool> = new Map();

    constructor() {
        // Load internal tools by default
        for (const tool of internalTools) {
            this.register(tool);
        }
    }

    register(tool: Tool) {
        this.tools.set(tool.name, tool);
    }

    getTool(name: string): Tool | undefined {
        return this.tools.get(name);
    }

    getAllTools(): Tool[] {
        return Array.from(this.tools.values());
    }

    async executeTool(name: string, args: any, context?: any): Promise<any> {
        const tool = this.getTool(name);
        if (!tool) throw new Error(`Tool ${name} not found`);
        return tool.execute(args, context || { registry: this });
    }
}
