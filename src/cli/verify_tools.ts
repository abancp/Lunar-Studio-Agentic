import { workspaceTools } from '../../tools/workspace.js';
import * as config from './config.js';
import fs from 'fs';
import path from 'path';
import { createLLM } from '../../llm/factory.js'; // Ensure correct path
// Mocking LLM for tool verification or just testing tools directly

async function verify() {
    console.log("Verifying Workspace Tools...");

    // Setup temp workspace
    const tempWs = path.join(process.cwd(), 'temp_workspace_test');
    if (fs.existsSync(tempWs)) {
        fs.rmSync(tempWs, { recursive: true, force: true });
    }
    fs.mkdirSync(tempWs);
    config.setWorkspace(tempWs);
    console.log(`Temporary workspace set to: ${tempWs}`);

    // Create dummy files
    fs.writeFileSync(path.join(tempWs, 'test.txt'), 'hello world');
    fs.mkdirSync(path.join(tempWs, 'subdir'));
    fs.writeFileSync(path.join(tempWs, 'subdir', 'ignore.me'), 'ignore');
    fs.writeFileSync(path.join(tempWs, 'script.ts'), 'console.log("script");');

    // Test ListDirectory
    console.log("\n--- Testing list_directory ---");
    const listTool = workspaceTools.find(t => t.name === 'list_directory')!;
    const listResult = await listTool.execute({});
    console.log("List Root:", listResult);
    if (listResult.includes('test.txt') && listResult.includes('subdir')) {
        console.log("PASS: Listed root correctly.");
    } else {
        console.error("FAIL: List root failed.");
    }

    // Test SearchFiles
    console.log("\n--- Testing search_files ---");
    const searchTool = workspaceTools.find(t => t.name === 'search_files')!;
    const searchResult = await searchTool.execute({ pattern: '**/*.ts' });
    console.log("Search *.ts:", searchResult);
    if (searchResult.includes('script.ts')) {
        console.log("PASS: Found script.ts");
    } else {
        console.error("FAIL: Search failed.");
    }

    // Test ExecuteCommand
    console.log("\n--- Testing execute_command ---");
    const execTool = workspaceTools.find(t => t.name === 'execute_command')!;
    const execResult = await execTool.execute({ command: 'ls -R' });
    console.log("Exec ls -R:", execResult);
    if (execResult.includes('test.txt')) {
        console.log("PASS: Executed ls.");
    } else {
        console.error("FAIL: Exec failed.");
    }

    // Cleanup
    config.setWorkspace(process.env.HOME ? `${process.env.HOME}/lunarstudio/.workspace` : './workspace'); // Reset to default-ish or just don't break user config?
    // actually better to invoke prompt setup again if needed.
    // For now, let's just leave it or try to restore if we saved it before.
    // In a real test we'd mock config.
    console.log("\nCleaning up...");
    fs.rmSync(tempWs, { recursive: true, force: true });
    console.log("Done.");
}

verify().catch(console.error);
