import { z } from 'zod';
import { activeWhatsAppClient } from '../external-apps/client_instance.js';
import { logger } from '../src/log.js';
import * as config from '../src/cli/config.js';
import path from 'path';
import fs from 'fs';
import pkg from 'whatsapp-web.js';
const { MessageMedia } = pkg;

export const sendWhatsAppTool = {
    name: 'send_whatsapp_message',
    description: 'Send a WhatsApp message and optionally a file to a specific person or number. Use this to proactively contact someone.',
    schema: z.object({
        to: z.string().describe('The name of the person (as configured) or a specific phone number (e.g., 1234567890@c.us)'),
        message: z.string().describe('The text message to send'),
        mediaPath: z.string().optional().describe('Optional absolute path to a file or media to send'),
    }),
    execute: async ({ to, message, mediaPath }: { to: string; message: string; mediaPath?: string }) => {
        if (!activeWhatsAppClient) {
            return "Error: WhatsApp client is not connected. Make sure the daemon is running and WhatsApp is enabled.";
        }

        let chatId = to;

        // 1. Try to resolve person name to number
        const people = config.getPeople();
        const person = people.find(p => p.name.toLowerCase() === to.toLowerCase());

        if (person) {
            if (person.whatsappNumber) {
                chatId = person.whatsappNumber;
                logger.info(`Resolved name "${to}" to ${chatId}`);
            } else {
                return `Error: Person "${to}" is known but has no WhatsApp number configured.`;
            }
        } else {
            // Assume it's a number, validation could be improved
            if (!chatId.includes('@')) {
                // thorough check if it looks like a number
                if (/^\d{10,15}$/.test(chatId)) {
                    chatId = `${chatId}@c.us`;
                } else {
                    logger.warn(`Assuming "${chatId}" is a chat ID or will be handled by WA.`);
                }
            }
        }

        try {
            // Check if number is registered (optional but good practice)
            // const isRegistered = await activeWhatsAppClient.isRegisteredUser(chatId);
            // if (!isRegistered) return `Error: Number ${chatId} is not registered on WhatsApp.`;

            if (mediaPath) {
                const absPath = path.resolve(mediaPath);
                if (!fs.existsSync(absPath)) {
                    return `Error: File not found at ${absPath}`;
                }

                const fileName = path.basename(absPath);
                const media = MessageMedia.fromFilePath(absPath);

                await activeWhatsAppClient.sendMessage(chatId, media, {
                    caption: message + "\n(ai)",
                });
                return `Sent media message to ${to} (${chatId})`;
            } else {
                await activeWhatsAppClient.sendMessage(chatId, message + "\n(ai)");
                return `Sent text message to ${to} (${chatId})`;
            }
        } catch (error: any) {
            logger.error(`Failed to send WhatsApp message to ${to}: ${error.message}`);
            return `Error sending message: ${error.message}`;
        }
    },
};
