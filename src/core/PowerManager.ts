import fs from 'fs';
import path from 'path';
import { getPowersDir } from '../cli/config.js';
import { ToolRegistry } from './ToolRegistry.js';
import { logger } from '../log.js';

export class PowerManager {
    private registry: ToolRegistry;
    private powersDir: string;

    constructor(registry: ToolRegistry) {
        this.registry = registry;
        this.powersDir = getPowersDir();
        this.ensurePowersDir();
    }

    private ensurePowersDir() {
        if (!fs.existsSync(this.powersDir)) {
            fs.mkdirSync(this.powersDir, { recursive: true });
        }

        const packageJsonPath = path.join(this.powersDir, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            fs.writeFileSync(packageJsonPath, JSON.stringify({
                name: 'lunarstudio-powers',
                version: '1.0.0',
                description: 'Installed powers (plugins) for Lunar Studio Agent',
                dependencies: {}
            }, null, 2));
        }
    }

    async loadPowers() {
        const packageJsonPath = path.join(this.powersDir, 'package.json');
        if (!fs.existsSync(packageJsonPath)) return;

        try {
            const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const deps = Object.keys(pkg.dependencies || {});

            for (const dep of deps) {
                try {
                    const depPath = path.join(this.powersDir, 'node_modules', dep);
                    const modulePath = await this.resolveModuleMain(depPath);
                    if (!modulePath) {
                        logger.error(`Could not resolve main file for power ${dep}`);
                        continue;
                    }

                    const powerModule = await import(new URL(`file://${modulePath}`).href);

                    let toolsToRegister = [];
                    if (powerModule.tools && Array.isArray(powerModule.tools)) {
                        toolsToRegister = powerModule.tools;
                    } else if (powerModule.default && Array.isArray(powerModule.default)) {
                        toolsToRegister = powerModule.default;
                    }

                    for (const tool of toolsToRegister) {
                        this.registry.register(tool);
                        logger.info(`Registered power tool: ${tool.name} from ${dep}`);
                    }

                } catch (e: any) {
                    logger.error(`Failed to load power ${dep}: ${e.message}`);
                }
            }
        } catch (e: any) {
            logger.error(`Failed to read powers package.json: ${e.message}`);
        }
    }

    private async resolveModuleMain(depPath: string): Promise<string | null> {
        const packageJsonPath = path.join(depPath, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            if (fs.existsSync(path.join(depPath, 'index.js'))) return path.join(depPath, 'index.js');
            return null;
        }

        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const main = pkg.main || (pkg.exports && (pkg.exports.import || pkg.exports.default)) || 'index.js';

        const mainPath = typeof main === 'string' ? path.join(depPath, main) : path.join(depPath, 'index.js');
        if (fs.existsSync(mainPath)) return mainPath;

        if (fs.existsSync(path.join(depPath, 'index.js'))) return path.join(depPath, 'index.js');

        return null;
    }
}
