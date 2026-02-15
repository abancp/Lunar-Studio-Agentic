import { v4 as uuidv4 } from 'uuid';
import * as config from './cli/config.js';

export class PeopleManager {
    constructor() { }

    getPeople(): config.Person[] {
        return config.getPeople();
    }

    addPerson(person: Omit<config.Person, 'id'>): config.Person {
        const people = this.getPeople();
        const newPerson: config.Person = {
            id: uuidv4(),
            ...person
        };
        people.push(newPerson);
        config.setPeople(people);
        return newPerson;
    }

    updatePerson(id: string, updates: Partial<config.Person>): config.Person | null {
        const people = this.getPeople();
        const index = people.findIndex(p => p.id === id);
        if (index === -1) return null;

        const currentPerson = people[index];
        if (!currentPerson) return null; // Safety check

        // Remove undefined fields from updates to avoid overwriting existing data with undefined
        const cleanUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );

        const updatedPerson: config.Person = {
            ...currentPerson,
            ...cleanUpdates,
            id: currentPerson.id // Ensure ID is never overwritten
        } as config.Person;

        people[index] = updatedPerson;
        config.setPeople(people);
        return updatedPerson;
    }

    deletePerson(id: string): boolean {
        const people = this.getPeople();
        const newPeople = people.filter(p => p.id !== id);
        if (newPeople.length === people.length) return false;

        config.setPeople(newPeople);
        return true;
    }

    findPersonByName(name: string): config.Person | undefined {
        const people = this.getPeople();
        return people.find(p => p.name.toLowerCase() === name.toLowerCase());
    }
}
