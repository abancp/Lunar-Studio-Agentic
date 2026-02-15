import { v4 as uuidv4 } from 'uuid';
import Conf from 'conf';
import { getPeople, Person } from './cli/config.js';

export interface Memory {
    id: string;
    content: string;
    personId: string;       // "owner" for CLI, or Person.id for others
    createdAt: number;
    tags?: string[];
}

interface MemoryStore {
    memories: Memory[];
}

const store = new Conf<MemoryStore>({
    projectName: 'lunarstudio-memory',
    defaults: { memories: [] },
});

// Regex to match inline memory block from LLM response
const MEMORY_REGEX = /<MEMORY>\s*(\[[\s\S]*?\])\s*<\/MEMORY>/;

export class MemoryManager {

    getMemories(personId?: string, limit: number = 20): Memory[] {
        const all = store.get('memories') || [];
        const filtered = personId ? all.filter(m => m.personId === personId) : all;
        return filtered.slice(-limit);
    }

    getAllMemories(): Memory[] {
        return store.get('memories') || [];
    }

    addMemory(content: string, personId: string, tags?: string[]): Memory {
        const memories = this.getAllMemories();
        const mem: Memory = {
            id: uuidv4(),
            content: content.trim(),
            personId,
            createdAt: Math.floor(Date.now() / 1000),
            tags,
        };
        memories.push(mem);
        store.set('memories', memories);
        return mem;
    }

    deleteMemory(id: string): boolean {
        const memories = this.getAllMemories();
        const filtered = memories.filter(m => m.id !== id);
        if (filtered.length === memories.length) return false;
        store.set('memories', filtered);
        return true;
    }

    searchMemories(personId: string, query: string, limit: number = 5): Memory[] {
        const memories = this.getMemories(personId, 100);
        const words = query.toLowerCase().split(/\s+/);
        const scored = memories.map(m => {
            const text = m.content.toLowerCase();
            const score = words.filter(w => text.includes(w)).length;
            return { memory: m, score };
        });
        return scored
            .filter(s => s.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(s => s.memory);
    }

    /**
     * Get memories that a specific requester has access to for a given person.
     * Access rules:
     *   - "owner" always has access to their own memories
     *   - memoryAccessibleBy: ["owner"] = only owner
     *   - memoryAccessibleBy: ["*"] = everyone
     *   - memoryAccessibleBy: ["owner", "<personId>"] = owner + that person
     */
    getAccessibleMemories(memoryOwnerId: string, requesterId: string, limit: number = 20): Memory[] {
        const people = getPeople();
        const memoryOwner = people.find(p => p.id === memoryOwnerId);

        // Owner always has full access to all memories
        if (requesterId === 'owner') {
            return this.getMemories(memoryOwnerId, limit);
        }

        // Person accessing their own memories
        if (requesterId === memoryOwnerId) {
            const acl = memoryOwner?.memoryAccessibleBy || ['owner'];
            if (acl.includes('*') || acl.includes(requesterId)) {
                return this.getMemories(memoryOwnerId, limit);
            }
            return [];
        }

        // Check ACL
        const acl = memoryOwner?.memoryAccessibleBy || ['owner'];
        if (acl.includes('*') || acl.includes(requesterId)) {
            return this.getMemories(memoryOwnerId, limit);
        }

        return [];
    }

    /**
     * Build a context string of relevant memories for injection into system prompt.
     * Includes accessible memories + people info.
     * Max 5 recent + 3 keyword-matched.
     */
    getContextString(personId: string, query?: string): string {
        const recent = this.getAccessibleMemories(personId, personId, 5);
        let searchHits: Memory[] = [];
        if (query) {
            // Search within accessible memories
            const allAccessible = this.getAccessibleMemories(personId, personId, 100);
            const words = query.toLowerCase().split(/\s+/);
            const scored = allAccessible.map(m => {
                const text = m.content.toLowerCase();
                const score = words.filter(w => text.includes(w)).length;
                return { memory: m, score };
            });
            searchHits = scored
                .filter(s => s.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, 3)
                .map(s => s.memory);
        }

        // Also include owner's memories about this person (for WhatsApp context)
        const ownerMemories = personId !== 'owner'
            ? this.getAccessibleMemories(personId, 'owner', 5)
            : [];

        // Merge & dedupe
        const seen = new Set<string>();
        const combined: Memory[] = [];
        for (const m of [...searchHits, ...ownerMemories, ...recent]) {
            if (!seen.has(m.id)) {
                seen.add(m.id);
                combined.push(m);
            }
        }

        let result = '';

        // Add people context
        const peopleInfo = this.getPeopleContext();
        if (peopleInfo) {
            result += peopleInfo;
        }

        if (combined.length > 0) {
            const lines = combined.map(m => `- ${m.content}`).join('\n');
            result += `\nMEMORY (things you remember about this person):\n${lines}\n`;
        }

        return result;
    }

    /**
     * Build a summary of configured people for the system prompt.
     * The bot needs to know who it's talking to.
     */
    getPeopleContext(): string {
        const people = getPeople();
        if (people.length === 0) return '';

        const lines = people.map(p => {
            let info = `- ${p.name} (${p.relation})`;
            if (p.whatsappNumber) info += ` [WA: ${p.whatsappNumber}]`;
            return info;
        });

        return `\nKNOWN PEOPLE:\n${lines.join('\n')}\n`;
    }

    /**
     * Parse inline <MEMORY> block from LLM response.
     * Returns the cleaned response text (without the memory block)
     * and saves extracted facts to the store.
     */
    parseAndSaveMemories(responseText: string, personId: string): string {
        const match = responseText.match(MEMORY_REGEX);
        if (!match) return responseText;

        const cleanResponse = responseText.replace(MEMORY_REGEX, '').trim();

        try {
            const facts: string[] = JSON.parse(match[1]!);
            if (!Array.isArray(facts)) return cleanResponse;

            const existing = this.getMemories(personId, 100);
            const existingTexts = new Set(existing.map(m => m.content.toLowerCase()));

            for (const fact of facts) {
                if (typeof fact === 'string' && fact.trim().length > 0) {
                    const normalized = fact.trim().toLowerCase();
                    if (!existingTexts.has(normalized)) {
                        this.addMemory(fact.trim(), personId);
                        existingTexts.add(normalized);
                    }
                }
            }
        } catch (e) {
            // Silent fail
        }

        return cleanResponse;
    }

    /**
     * Resolve a WhatsApp chatId to a personId.
     * Returns personId if configured, null otherwise.
     */
    resolvePersonId(chatId: string): string | null {
        const people = getPeople();
        const person = people.find(p => p.whatsappNumber === chatId);
        return person ? person.id : null;
    }

    /**
     * Check if a person is configured (has memories enabled).
     */
    isConfiguredPerson(chatId: string): boolean {
        return this.resolvePersonId(chatId) !== null;
    }
}
