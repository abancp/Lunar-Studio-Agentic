import { z } from 'zod';
import { Tool } from '../llm/types.js';
import * as config from '../src/cli/config.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fg from 'fast-glob';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

// Helper to ensure workspace exists
const ensureWorkspace = () => {
    const ws = config.getWorkspace();
    if (!fs.existsSync(ws)) {
        fs.mkdirSync(ws, { recursive: true });
    }
    return ws;
};

export const workspaceTools: Tool[] = [
    {
        name: 'execute_command',
        description: 'Execute a shell command within the workspace directory. USE CAUTION.',
        schema: z.object({
            command: z.string().describe('The command to execute, e.g., "ls -la", "echo hello > test.txt"'),
        }),
        execute: async ({ command }) => {
            const cwd = ensureWorkspace();
            try {
                // Safety check: prevent cd .. or simple attempt to escape (not robust)
                if (command.includes('..')) {
                    return "Error: Navigation outside workspace (..) is not allowed for safety.";
                }

                if (command.includes('rm')) {
                    return "cant remove a file , protected"
                }

                const { stdout, stderr } = await execAsync(command, { cwd });
                if (stderr) {
                    return `Output:\n${stdout}\nErrors:\n${stderr}`;
                }
                return stdout || "Command executed successfully (no output).";
            } catch (e: any) {
                return `Error executing command: ${e.message}\nStderr: ${e.stderr}`;
            }
        },
    },
    {
        name: 'search_files',
        description: 'Search for files in the workspace using glob patterns.',
        schema: z.object({
            pattern: z.string().describe('Glob pattern to search, e.g., "**/*.ts", "src/*.json"'),
        }),
        execute: async ({ pattern }) => {
            const cwd = ensureWorkspace();
            try {
                const entries = await fg(pattern, { cwd, stats: true, objectMode: true });
                if (entries.length === 0) {
                    return "No files found matching pattern.";
                }
                return JSON.stringify(entries.map(e => ({
                    path: e.path,
                    size: e.stats?.size,
                    mtime: e.stats?.mtime
                })), null, 2);
            } catch (e: any) {
                return `Error searching files: ${e.message}`;
            }
        },
    },
    {
        name: 'list_directory',
        description: 'List contents of a directory within the workspace.',
        schema: z.object({
            subpath: z.string().optional().describe('Relative path to list (defaults to root workspace)'),
        }),
        execute: async ({ subpath }) => {
            const root = ensureWorkspace();
            const target = subpath ? path.resolve(root, subpath) : root;

            // Security check to ensure target is within root
            if (!target.startsWith(root)) {
                return "Error: Access denied. Cannot list outside workspace.";
            }

            try {
                if (!fs.existsSync(target)) return "Directory does not exist.";

                const entries = fs.readdirSync(target, { withFileTypes: true });
                const result = entries.map(e => {
                    return {
                        name: e.name,
                        type: e.isDirectory() ? 'directory' : 'file',
                    };
                });
                return JSON.stringify(result, null, 2);
            } catch (e: any) {
                return `Error listing directory: ${e.message}`;
            }
        },
    }
];
