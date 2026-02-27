'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import { Maximize2, X } from 'lucide-react';

// Initialize mermaid with dark theme
mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    themeVariables: {
        primaryColor: '#22c55e',
        primaryTextColor: '#ffffff',
        primaryBorderColor: '#22c55e',
        lineColor: '#a1a1aa',
        secondaryColor: '#18181b',
        tertiaryColor: '#0a0a0a',
        background: '#0a0a0a',
        mainBkg: '#18181b',
        nodeBorder: '#22c55e',
        clusterBkg: '#18181b',
        clusterBorder: '#27272a',
        titleColor: '#ffffff',
        edgeLabelBackground: '#0a0a0a',
    },
    flowchart: {
        htmlLabels: true,
        curve: 'basis',
        padding: 15,
    },
});

interface MermaidDiagramProps {
    code: string;
}

export default function MermaidDiagram({ code }: MermaidDiagramProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const modalContainerRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [isRendered, setIsRendered] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [svgContent, setSvgContent] = useState<string>('');

    const renderDiagram = useCallback(async (targetEl: HTMLDivElement | null) => {
        if (!targetEl || !code) return;
        try {
            setError(null);
            const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
            let cleanCode = code.trim();
            if (cleanCode.startsWith('```')) {
                const lines = cleanCode.split('\n');
                cleanCode = lines.slice(1, lines[lines.length - 1].trim() === '```' ? -1 : undefined).join('\n');
            }
            if (!cleanCode.startsWith('graph') && !cleanCode.startsWith('flowchart')) {
                cleanCode = 'graph TD\n' + cleanCode;
            }
            const { svg } = await mermaid.render(id, cleanCode);
            setSvgContent(svg);
            targetEl.innerHTML = svg;
            setIsRendered(true);
        } catch (err) {
            console.error('Mermaid rendering failed:', err);
            setError('Failed to render diagram');
            targetEl.innerHTML = '';
        }
    }, [code]);

    // Render inline diagram
    useEffect(() => {
        renderDiagram(containerRef.current);
    }, [renderDiagram]);

    // Render expanded modal diagram
    useEffect(() => {
        if (isExpanded && modalContainerRef.current && svgContent) {
            modalContainerRef.current.innerHTML = svgContent;
        }
    }, [isExpanded, svgContent]);

    // Close modal on Escape
    useEffect(() => {
        if (!isExpanded) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsExpanded(false);
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isExpanded]);

    if (!code) return null;

    return (
        <>
            {/* Inline (sidebar) diagram */}
            <div
                className="w-full overflow-x-auto rounded-lg border animate-fade-in cursor-pointer group relative"
                style={{
                    background: 'var(--lucid-bg)',
                    borderColor: 'var(--lucid-border)',
                    padding: '1rem',
                }}
                onClick={() => setIsExpanded(true)}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-3 pb-2" style={{ borderBottom: '1px solid var(--lucid-border)' }}>
                    <div className="flex items-center gap-2">
                        <span
                            className="w-2 h-2 rounded-full animate-pulse"
                            style={{ background: 'var(--lucid-green)' }}
                        />
                        <span
                            className="text-xs font-mono font-semibold"
                            style={{ color: 'var(--lucid-green)' }}
                        >
                            SYSTEM ARCHITECTURE
                        </span>
                    </div>
                    <button
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-all opacity-60 group-hover:opacity-100 hover:bg-white/10"
                        style={{ color: 'var(--lucid-text-secondary)' }}
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
                        title="Expand diagram"
                    >
                        <Maximize2 size={12} />
                        <span>Expand</span>
                    </button>
                </div>

                {/* Diagram */}
                {error ? (
                    <div className="text-center py-4">
                        <p className="text-red-400 text-sm">{error}</p>
                        <pre className="mt-2 text-xs text-gray-500 overflow-auto max-h-32 p-2 rounded bg-zinc-900">
                            {code}
                        </pre>
                    </div>
                ) : (
                    <div
                        ref={containerRef}
                        className="flex justify-center items-center min-h-[100px]"
                        style={{
                            opacity: isRendered ? 1 : 0.5,
                            transition: 'opacity 0.3s ease',
                        }}
                    />
                )}

                {/* Hover hint */}
                <div className="text-center mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] text-zinc-500">Click to expand</span>
                </div>
            </div>

            {/* Fullscreen Modal with Zoom & Pan */}
            {isExpanded && (
                <ZoomableModal
                    svgContent={svgContent}
                    modalContainerRef={modalContainerRef}
                    onClose={() => setIsExpanded(false)}
                />
            )}
        </>
    );
}


// ─── Zoomable Modal Component ────────────────────────────────────────

interface ZoomableModalProps {
    svgContent: string;
    modalContainerRef: React.RefObject<HTMLDivElement | null>;
    onClose: () => void;
}

function ZoomableModal({ svgContent, modalContainerRef, onClose }: ZoomableModalProps) {
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const viewportRef = useRef<HTMLDivElement>(null);

    const MIN_ZOOM = 0.3;
    const MAX_ZOOM = 3;
    const ZOOM_STEP = 0.15;

    const handleZoomIn = () => setZoom(z => Math.min(MAX_ZOOM, z + ZOOM_STEP));
    const handleZoomOut = () => setZoom(z => Math.max(MIN_ZOOM, z - ZOOM_STEP));
    const handleResetZoom = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
    const handleFitZoom = () => { setZoom(0.8); setPan({ x: 0, y: 0 }); };

    // Mouse wheel zoom
    useEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
            setZoom(z => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta)));
        };

        viewport.addEventListener('wheel', handleWheel, { passive: false });
        return () => viewport.removeEventListener('wheel', handleWheel);
    }, []);

    // Drag to pan
    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    };

    const handleMouseUp = () => setIsDragging(false);

    return (
        <div
            className="fixed inset-0 z-[999] flex items-center justify-center"
            style={{ background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)' }}
            onClick={onClose}
        >
            <div
                className="relative w-[90vw] h-[85vh] rounded-2xl border overflow-hidden"
                style={{ background: '#0a0a0a', borderColor: 'var(--lucid-border)' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div
                    className="sticky top-0 z-10 flex items-center justify-between px-6 py-3"
                    style={{
                        background: 'rgba(10, 10, 10, 0.95)',
                        borderBottom: '1px solid var(--lucid-border)',
                        backdropFilter: 'blur(12px)',
                    }}
                >
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--lucid-green)' }} />
                        <span className="text-sm font-mono font-semibold" style={{ color: 'var(--lucid-green)' }}>
                            SYSTEM ARCHITECTURE
                        </span>
                    </div>

                    {/* Zoom Controls */}
                    <div className="flex items-center gap-1">
                        <button onClick={handleFitZoom} className="px-2.5 py-1 rounded text-xs text-zinc-400 hover:bg-white/10 hover:text-white transition-all" title="Fit to view">Fit</button>
                        <button onClick={handleZoomOut} className="w-7 h-7 rounded flex items-center justify-center text-zinc-400 hover:bg-white/10 hover:text-white transition-all text-lg" title="Zoom out">−</button>
                        <span className="text-xs text-zinc-500 font-mono w-12 text-center select-none">{Math.round(zoom * 100)}%</span>
                        <button onClick={handleZoomIn} className="w-7 h-7 rounded flex items-center justify-center text-zinc-400 hover:bg-white/10 hover:text-white transition-all text-lg" title="Zoom in">+</button>
                        <button onClick={handleResetZoom} className="px-2.5 py-1 rounded text-xs text-zinc-400 hover:bg-white/10 hover:text-white transition-all ml-1" title="Reset zoom">Reset</button>
                        <div className="w-px h-5 bg-zinc-700 mx-2" />
                        <button
                            onClick={onClose}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm text-zinc-400 hover:bg-white/10 hover:text-white transition-all"
                        >
                            <X size={14} />
                            <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-500 border border-zinc-700">ESC</kbd>
                        </button>
                    </div>
                </div>

                {/* Zoomable Diagram Viewport */}
                <div
                    ref={viewportRef}
                    className="w-full overflow-hidden"
                    style={{
                        height: 'calc(85vh - 52px)',
                        cursor: isDragging ? 'grabbing' : 'grab',
                    }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    <div
                        ref={modalContainerRef}
                        className="flex justify-center items-center w-full h-full"
                        style={{
                            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                            transformOrigin: 'center center',
                            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                        }}
                    />
                </div>

                {/* Zoom hint */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 rounded-full bg-zinc-900/80 border border-zinc-800 backdrop-blur-sm">
                    <span className="text-[11px] text-zinc-500">Scroll to zoom</span>
                    <span className="text-zinc-700">•</span>
                    <span className="text-[11px] text-zinc-500">Drag to pan</span>
                </div>
            </div>
        </div>
    );
}
