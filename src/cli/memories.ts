import chalk from 'chalk';
import { MemoryManager } from '../memory.js';
import { getPeople } from './config.js';

export async function memoriesCommand(options: { person?: string }) {
    const memoryManager = new MemoryManager();
    const allMemories = memoryManager.getAllMemories();

    if (allMemories.length === 0) {
        console.log(chalk.yellow('No memories stored yet.'));
        return;
    }

    // Resolve person filter
    let filterPersonId: string | undefined;
    if (options.person) {
        const people = getPeople();
        const match = people.find(p => p.name.toLowerCase() === options.person!.toLowerCase());
        if (match) {
            filterPersonId = match.id;
        } else if (options.person.toLowerCase() === 'owner') {
            filterPersonId = 'owner';
        } else {
            console.log(chalk.red(`Person "${options.person}" not found. Showing all memories.`));
        }
    }

    const memories = filterPersonId
        ? allMemories.filter(m => m.personId === filterPersonId)
        : allMemories;

    if (memories.length === 0) {
        console.log(chalk.yellow(`No memories found for "${options.person}".`));
        return;
    }

    // Group by personId
    const grouped = new Map<string, typeof memories>();
    for (const m of memories) {
        const group = grouped.get(m.personId) || [];
        group.push(m);
        grouped.set(m.personId, group);
    }

    // Resolve person names
    const people = getPeople();
    const nameMap = new Map<string, string>();
    nameMap.set('owner', 'Owner (CLI)');
    for (const p of people) {
        nameMap.set(p.id, p.name);
    }

    console.log(chalk.bold.blue('\n📝 Stored Memories\n'));

    for (const [personId, mems] of grouped) {
        const name = nameMap.get(personId) || personId;
        console.log(chalk.cyan.bold(`  ${name} (${mems.length})`));
        for (const m of mems) {
            const date = new Date(m.createdAt * 1000).toLocaleDateString();
            console.log(chalk.dim(`    ${date}`) + ` ${m.content}`);
        }
        console.log();
    }

    console.log(chalk.dim(`Total: ${memories.length} memories\n`));
}
