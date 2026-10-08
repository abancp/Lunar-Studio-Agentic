import React, { useState, useRef } from 'react';
import { Download, X, Play, FileText, File, Image, Music, Archive, Code, ZoomIn } from 'lucide-react';

export interface FileMessage {
    id: string;
    fileName: string;
    mimeType: string;
    data: string; // base64
    caption?: string;
    forceDownload?: boolean;
    sizeBytes?: number;
    timestamp: string;
}

// ── Helpers ──────────────────────────────────────────────────

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getDataUrl(mimeType: string, data: string): string {
    return `data:${mimeType};base64,${data}`;
}

function downloadFile(fileName: string, mimeType: string, data: string) {
    const a = document.createElement('a');
    a.href = getDataUrl(mimeType, data);
    a.download = fileName;
    a.click();
}

function fileIcon(mimeType: string) {
    if (mimeType.startsWith('image/')) return <Image size={18} />;
    if (mimeType.startsWith('video/')) return <Play size={18} />;
    if (mimeType.startsWith('audio/')) return <Music size={18} />;
    if (mimeType === 'application/pdf') return <FileText size={18} />;
    if (mimeType.startsWith('text/')) return <Code size={18} />;
    if (mimeType.includes('zip') || mimeType.includes('tar')) return <Archive size={18} />;
    return <File size={18} />;
}

// ── Lightbox ─────────────────────────────────────────────────

function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={onClose}
        >
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
                <X size={20} />
            </button>
            <img
                src={src}
                alt={alt}
                className="max-w-[92vw] max-h-[92vh] object-contain rounded-lg shadow-2xl"
                onClick={e => e.stopPropagation()}
            />
        </div>
    );
}

// ── MediaMessage Component ────────────────────────────────────

export function MediaMessage({ file }: { file: FileMessage }) {
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const dataUrl = getDataUrl(file.mimeType, file.data);

    const handleDownload = () => downloadFile(file.fileName, file.mimeType, file.data);

    // ── IMAGE ──────────────────────────────────────────────
    if (file.mimeType.startsWith('image/') && !file.forceDownload) {
        return (
            <>
                <div className="flex flex-col gap-2 max-w-[340px] sm:max-w-[460px]">
                    <div className="relative group rounded-2xl overflow-hidden border border-white/10 bg-bg-tertiary/40 shadow-lg">
                        <img
                            src={dataUrl}
                            alt={file.fileName}
                            className="w-full object-cover cursor-zoom-in max-h-[320px]"
                            onClick={() => setLightboxOpen(true)}
                        />
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center pointer-events-none">
                            <ZoomIn size={28} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {/* Download button */}
                        <button
                            onClick={handleDownload}
                            className="absolute bottom-2 right-2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer backdrop-blur-sm"
                        >
                            <Download size={14} />
                        </button>
                    </div>
                    {file.caption && (
                        <p className="text-xs text-text-muted px-1">{file.caption}</p>
                    )}
                    <div className="flex items-center gap-2 px-1">
                        <span className="text-[10px] text-text-muted font-mono">{file.fileName}</span>
                        {file.sizeBytes && (
                            <span className="text-[10px] text-text-muted">· {formatBytes(file.sizeBytes)}</span>
                        )}
                    </div>
                </div>
                {lightboxOpen && (
                    <Lightbox src={dataUrl} alt={file.fileName} onClose={() => setLightboxOpen(false)} />
                )}
            </>
        );
    }

    // ── VIDEO ──────────────────────────────────────────────
    if (file.mimeType.startsWith('video/') && !file.forceDownload) {
        return (
            <div className="flex flex-col gap-2 max-w-[460px]">
                <div className="rounded-2xl overflow-hidden border border-white/10 bg-bg-tertiary/40 shadow-lg">
                    <video
                        ref={videoRef}
                        src={dataUrl}
                        controls
                        className="w-full max-h-[300px] object-contain"
                    />
                </div>
                {file.caption && <p className="text-xs text-text-muted px-1">{file.caption}</p>}
                <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] text-text-muted font-mono">{file.fileName}</span>
                    <button
                        onClick={handleDownload}
                        className="flex items-center gap-1.5 text-[10px] text-accent-primary hover:text-accent-primary/80 cursor-pointer"
                    >
                        <Download size={11} /> Download
                    </button>
                </div>
            </div>
        );
    }

    // ── AUDIO ──────────────────────────────────────────────
    if (file.mimeType.startsWith('audio/') && !file.forceDownload) {
        return (
            <div className="flex flex-col gap-2 max-w-[360px]">
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/10 bg-bg-tertiary/60">
                    <div className="w-8 h-8 rounded-full bg-accent-primary/15 flex items-center justify-center shrink-0">
                        <Music size={14} className="text-accent-primary-light" />
                    </div>
                    <audio controls src={dataUrl} className="flex-1 h-8" style={{ minWidth: 0 }} />
                </div>
                {file.caption && <p className="text-xs text-text-muted px-1">{file.caption}</p>}
                <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] text-text-muted font-mono truncate">{file.fileName}</span>
                    <button onClick={handleDownload} className="flex items-center gap-1 text-[10px] text-accent-primary cursor-pointer shrink-0">
                        <Download size={10} /> Save
                    </button>
                </div>
            </div>
        );
    }

    // ── FILE CARD (PDF, docs, zip, etc.) ───────────────────
    return (
        <FileCard file={file} dataUrl={dataUrl} onDownload={handleDownload} />
    );
}

// ── Generic File Card ─────────────────────────────────────────

function FileCard({
    file,
    dataUrl,
    onDownload,
}: {
    file: FileMessage;
    dataUrl: string;
    onDownload: () => void;
}) {
    const isPdf = file.mimeType === 'application/pdf';
    const [pdfPreview, setPdfPreview] = useState(false);

    return (
        <div className="flex flex-col gap-2 max-w-[360px] w-full">
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-white/10 bg-bg-tertiary/60 group hover:bg-bg-tertiary/80 transition-colors">
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-accent-primary/10 border border-accent-primary/15 flex items-center justify-center shrink-0 text-accent-primary-light">
                    {fileIcon(file.mimeType)}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{file.fileName}</p>
                    <p className="text-[11px] text-text-muted mt-0.5">
                        {file.mimeType.split('/')[1]?.toUpperCase()}
                        {file.sizeBytes ? ` · ${formatBytes(file.sizeBytes)}` : ''}
                    </p>
                </div>
                {/* Actions */}
                <div className="flex flex-col gap-1 items-end shrink-0">
                    <button
                        onClick={onDownload}
                        title="Download"
                        className="p-1.5 rounded-lg hover:bg-accent-primary/10 text-text-secondary hover:text-accent-primary-light transition-colors cursor-pointer"
                    >
                        <Download size={15} />
                    </button>
                    {isPdf && (
                        <button
                            onClick={() => setPdfPreview(v => !v)}
                            title="Preview"
                            className="p-1.5 rounded-lg hover:bg-accent-primary/10 text-text-secondary hover:text-accent-primary-light transition-colors cursor-pointer text-[9px] font-semibold"
                        >
                            {pdfPreview ? 'Hide' : 'View'}
                        </button>
                    )}
                </div>
            </div>

            {/* PDF inline preview */}
            {isPdf && pdfPreview && (
                <div className="rounded-xl overflow-hidden border border-white/10 shadow-lg">
                    <iframe
                        src={dataUrl}
                        className="w-full h-[440px]"
                        title={file.fileName}
                    />
                </div>
            )}

            {file.caption && <p className="text-xs text-text-muted px-1">{file.caption}</p>}
        </div>
    );
}

// ── Upload Button (for bottom panel) ─────────────────────────

export function FileUploadButton({ onFile }: { onFile: (f: File) => void }) {
    const ref = useRef<HTMLInputElement>(null);
    return (
        <>
            <input
                ref={ref}
                type="file"
                className="hidden"
                onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) onFile(file);
                    e.target.value = '';
                }}
            />
            <button
                onClick={() => ref.current?.click()}
                className="p-2 rounded-lg hover:bg-bg-hover transition-colors text-text-secondary hover:text-text-primary cursor-pointer"
                title="Upload file to agent"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                </svg>
            </button>
        </>
    );
}
