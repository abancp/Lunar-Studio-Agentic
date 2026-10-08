/**
 * external-apps/lunar_studio.ts
 *
 * Tools bound to a live WebSocket connection to the Lunar Studio Flutter/Web app.
 * Modeled after whatsapp.ts — tools are created per-connection and injected into the agentic loop.
 */

import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { WebSocket } from 'ws';
import { logger } from '../src/log.js';
import { Tool } from '../llm/types.js';

// ── Mime type helper ──────────────────────────────────────────

const MIME_MAP: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.zip': 'application/zip',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.html': 'text/html',
    '.py': 'text/x-python',
    '.ts': 'text/typescript',
    '.js': 'text/javascript',
};

function getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    return MIME_MAP[ext] || 'application/octet-stream';
}

function isMediaMime(mime: string): boolean {
    return mime.startsWith('image/') || mime.startsWith('video/') || mime.startsWith('audio/');
}

// ── Shared file-send helper ───────────────────────────────────

function sendFileOverWs(
    ws: WebSocket,
    filePath: string,
    caption?: string,
    forceDownload: boolean = false
): string {
    const absPath = path.resolve(filePath);
    if (!fs.existsSync(absPath)) {
        return `Error: File not found at ${absPath}`;
    }

    const stats = fs.statSync(absPath);
    const sizeInMB = stats.size / (1024 * 1024);

    if (sizeInMB > 50) {
        return `Error: File too large (${sizeInMB.toFixed(1)} MB). Max 50 MB via WebSocket.`;
    }

    const fileName = path.basename(absPath);
    const mimeType = getMimeType(absPath);
    const data = fs.readFileSync(absPath).toString('base64');

    ws.send(JSON.stringify({
        type: 'file',
        fileName,
        mimeType,
        data,
        caption: caption || '',
        forceDownload,
        sizeBytes: stats.size,
    }));

    logger.info(`Sent file to app: ${fileName} (${mimeType}, ${sizeInMB.toFixed(2)} MB)`);
    return `File sent to app: ${fileName}`;
}

// ── Tool Factories ────────────────────────────────────────────

/**
 * send_file_to_app — send any file from disk to the connected app client.
 * The client will preview images/videos inline and offer a download button.
 */
export function createSendFileTool(ws: WebSocket): Tool {
    return {
        name: 'send_file_to_app',
        description:
            'Send a file from the server filesystem to the connected Lunar Studio app (web or Flutter). ' +
            'Images and videos will be displayed inline. PDFs and other files will show a download card. ' +
            'Use this whenever the user asks to see a file, image, chart, report, or any generated output.',
        schema: z.object({
            filePath: z.string().describe('Absolute or relative path to the file on the server'),
            caption: z.string().optional().describe('Optional caption or short description of the file'),
        }),
        execute: async ({ filePath, caption }: { filePath: string; caption?: string }) => {
            try {
                return sendFileOverWs(ws, filePath, caption, false);
            } catch (err: any) {
                return `Error sending file: ${err.message}`;
            }
        },
    };
}

/**
 * download_file_to_app — force-download a file (skips inline preview, triggers save-to-disk).
 */
export function createDownloadFileTool(ws: WebSocket): Tool {
    return {
        name: 'download_file_to_app',
        description:
            'Force-download a file to the Lunar Studio app user\'s device. ' +
            'Unlike send_file_to_app, this always triggers a download/save dialog rather than inline preview. ' +
            'Use for exports, archives, or when the user explicitly asks to download something.',
        schema: z.object({
            filePath: z.string().describe('Absolute or relative path to the file on the server'),
            caption: z.string().optional().describe('Optional description'),
        }),
        execute: async ({ filePath, caption }: { filePath: string; caption?: string }) => {
            try {
                return sendFileOverWs(ws, filePath, caption, true);
            } catch (err: any) {
                return `Error: ${err.message}`;
            }
        },
    };
}

/**
 * notify_app — send a toast/banner notification to the connected client.
 */
export function createNotifyTool(ws: WebSocket): Tool {
    return {
        name: 'notify_app',
        description:
            'Send a notification banner or toast to the connected Lunar Studio app. ' +
            'Use this to alert the user about background task completion, errors, or important events ' +
            'without requiring them to scroll through the chat.',
        schema: z.object({
            title: z.string().describe('Short notification title (max 60 chars)'),
            body: z.string().describe('Notification body text'),
            type: z.enum(['info', 'success', 'warning', 'error']).optional().describe('Visual style of the notification'),
        }),
        execute: async ({ title, body, type }: { title: string; body: string; type?: string }) => {
            ws.send(JSON.stringify({
                type: 'notify',
                title: title.slice(0, 60),
                body,
                notifyType: type || 'info',
            }));
            logger.info(`Notification sent to app: [${type || 'info'}] ${title}`);
            return `Notification sent: "${title}"`;
        },
    };
}

/**
 * read_app_file — read a file uploaded by the user through the app UI.
 * The file store is passed in; entries are populated by the server's upload_file handler.
 */
export function createReadAppFileTool(fileStore: Map<string, { path: string; name: string; mimeType: string }>): Tool {
    return {
        name: 'read_app_file',
        description:
            'Read the content of a file that was uploaded by the user through the Lunar Studio app. ' +
            'Use the fileId provided in the upload confirmation message. ' +
            'Returns the file content as text (for text files) or a base64 string (for binary files).',
        schema: z.object({
            fileId: z.string().describe('The fileId from the upload confirmation message'),
        }),
        execute: async ({ fileId }: { fileId: string }) => {
            const entry = fileStore.get(fileId);
            if (!entry) {
                return `Error: File "${fileId}" not found. It may have been uploaded in a previous session.`;
            }
            try {
                const mime = entry.mimeType;
                if (mime.startsWith('text/') || mime === 'application/json' || mime === 'text/csv') {
                    return fs.readFileSync(entry.path, 'utf-8');
                }
                // Binary — base64
                return `[Binary file: ${entry.name} — ${(fs.statSync(entry.path).size / 1024).toFixed(1)}KB, use workspace tools to process it]`;
            } catch (err: any) {
                return `Error reading file: ${err.message}`;
            }
        },
    };
}

/**
 * Build all Lunar Studio app tools for a given WebSocket connection.
 */
export function createLunarStudioTools(
    ws: WebSocket,
    fileStore: Map<string, { path: string; name: string; mimeType: string }>
): Tool[] {
    return [
        createSendFileTool(ws),
        createDownloadFileTool(ws),
        createNotifyTool(ws),
        createReadAppFileTool(fileStore),
    ];
}
