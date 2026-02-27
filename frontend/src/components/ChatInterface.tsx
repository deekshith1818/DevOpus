'use client';

import { useRef, useEffect, useState } from 'react';
import SmartInput, { AttachmentPayload } from './SmartInput';
import MermaidDiagram from './MermaidDiagram';
import { Network, ChevronDown, ChevronUp, ClipboardCheck, User, Bot, Loader2, ChevronLeft, Maximize2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

type GenerationStage = 'idle' | 'planning' | 'architecting' | 'coding' | 'reviewing' | 'modifying' | 'complete';

const stageMessages: Record<GenerationStage, string> = {
    idle: '',
    planning: 'Constructing a Master Plan....',
    architecting: 'Orchestrating things....',
    coding: 'Generating the code....',
    reviewing: 'Reviewing code quality....',
    modifying: 'Applying modifications....',
    complete: 'Code generation complete!',
};

// Represents a follow-up exchange (user prompt + system acknowledgment)
interface FollowUpMessage {
    prompt: string;
    response?: string;
}

interface ChatInterfaceProps {
    onGenerate: (prompt: string, attachments: AttachmentPayload) => Promise<void>;
    onFollowUp?: (prompt: string, attachments: AttachmentPayload) => Promise<void>;
    isLoading: boolean;
    isFollowUpLoading?: boolean;
    plan?: string;
    architect?: string;
    diagram?: string;
    files?: Record<string, string>;
    review?: string;
    stage?: GenerationStage;
    userPrompt?: string;           // The initial user prompt (shown in chat)
    followUpMessages?: FollowUpMessage[];  // Follow-up exchange history
    className?: string;            // Forwarded root container classes
}

export default function ChatInterface({
    onGenerate,
    onFollowUp,
    isLoading,
    isFollowUpLoading = false,
    plan,
    architect,
    diagram,
    files,
    review,
    stage = 'idle',
    userPrompt,
    followUpMessages = [],
    className = "",
}: ChatInterfaceProps) {
    const router = useRouter();
    const [showArchitecture, setShowArchitecture] = useState(true);
    const [showReview, setShowReview] = useState(true);
    const [expandedSection, setExpandedSection] = useState<'plan' | 'architect' | 'review' | null>(null);
    const logRef = useRef<HTMLDivElement>(null);

    const hasFiles = files && Object.keys(files).length > 0;
    const isComplete = stage === 'complete' && hasFiles;

    // Auto-scroll log area when content updates
    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [plan, architect, diagram, isLoading, files, stage, followUpMessages, isFollowUpLoading]);

    // Unified submit handler — routes based on state
    const handleSubmit = async (value: string, attachments: AttachmentPayload) => {
        const hasContent = value.trim() || attachments.images.length > 0 || attachments.pdf;
        if (!hasContent) return;

        if (isComplete && onFollowUp) {
            // Code exists → follow-up modification (coder only, saves API credits)
            await onFollowUp(value, attachments);
        } else if (!isLoading) {
            // No code yet → full generation pipeline (4 agents)
            await onGenerate(value, attachments);
        }
    };

    // Get current status message based on stage
    const getStatusMessage = () => {
        return stageMessages[stage] || '';
    };

    // Dynamic placeholder based on state
    const getPlaceholder = () => {
        if (isComplete) return "Request modifications... (e.g., 'Add dark mode toggle')";
        return "Describe your project...";
    };

    return (
        <>
            <div className={`flex flex-col h-full ${className}`}>
                {/* Header - Lucid Logo */}
                <div
                    className="px-5 py-4"
                    style={{ borderBottom: '1px solid var(--lucid-border)' }}
                >
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="p-1.5 -ml-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                            title="Back to Dashboard"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 backdrop-blur-md shrink-0">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                                <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
                                <polyline points="22 8.5 12 15.5 2 8.5" />
                                <line x1="12" y1="22" x2="12" y2="15.5" />
                            </svg>
                        </div>
                        <div>
                            <h1
                                className="text-lg font-semibold tracking-tight"
                                style={{ color: 'var(--lucid-text-primary)' }}
                            >
                                DevOpus
                            </h1>
                            <p
                                className="text-[12px] font-medium tracking-wide mt-[-2px] text-emerald-500"
                            >
                                Ready to Ship !
                            </p>
                        </div>
                    </div>
                </div>

                {/* Log Area - Terminal Style */}
                <div
                    ref={logRef}
                    className="flex-1 overflow-y-auto log-area p-4"
                >
                    {/* Welcome message */}
                    {!plan && !isLoading && !userPrompt && (
                        <div className="space-y-2 animate-in">
                            <div className="log-line log-success">$ lucid init</div>
                            <div className="log-line text-gray-500">
                                Ready to generate code. Describe your project below.
                            </div>
                        </div>
                    )}

                    {/* User's Initial Prompt */}
                    {userPrompt && (
                        <div className="mb-4 animate-in">
                            <div className="flex items-start gap-2.5">
                                <div
                                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                                    style={{ background: 'var(--lucid-green)', color: '#000' }}
                                >
                                    <User size={12} strokeWidth={2.5} />
                                </div>
                                <div
                                    className="px-3 py-2 rounded-xl rounded-tl-sm text-sm max-w-[85%]"
                                    style={{
                                        background: 'var(--lucid-bg)',
                                        border: '1px solid var(--lucid-border)',
                                        color: 'var(--lucid-text-primary)',
                                    }}
                                >
                                    {userPrompt}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Current Stage Indicator */}
                    {isLoading && (
                        <div className="space-y-2 mb-4">
                            <div className="log-line log-success">$ generating...</div>
                            <div className="flex items-center gap-2 mt-2">
                                <div
                                    className="w-2 h-2 rounded-full animate-pulse"
                                    style={{ background: 'var(--lucid-green)' }}
                                />
                                <span style={{ color: 'var(--lucid-text-muted)' }}>
                                    {getStatusMessage()}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Plan Display */}
                    {plan && (
                        <div className="space-y-3 animate-in">
                            <div className="flex items-center justify-between">
                                <div className="log-line log-success">✓ Plan generated</div>
                                <button
                                    onClick={() => setExpandedSection('plan')}
                                    className="p-1.5 rounded hover:bg-white/10 text-zinc-500 hover:text-white transition-all"
                                    title="Expand plan"
                                >
                                    <Maximize2 size={14} />
                                </button>
                            </div>
                            <div
                                className="p-3 rounded-lg"
                                style={{
                                    background: 'var(--lucid-bg)',
                                    border: '1px solid var(--lucid-border)'
                                }}
                            >
                                <pre
                                    className="whitespace-pre-wrap text-xs font-mono"
                                    style={{ color: 'var(--lucid-text-secondary)' }}
                                >
                                    {plan}
                                </pre>
                            </div>
                        </div>
                    )}

                    {/* Architecture Diagram Section */}
                    {diagram && (
                        <div className="mt-4 space-y-2 animate-in">
                            {/* Toggle Button */}
                            <button
                                onClick={() => setShowArchitecture(!showArchitecture)}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg w-full transition-colors hover:bg-zinc-800"
                                style={{
                                    background: 'var(--lucid-bg)',
                                    border: '1px solid var(--lucid-border)',
                                }}
                            >
                                <Network size={16} style={{ color: 'var(--lucid-green)' }} />
                                <span className="text-sm font-medium" style={{ color: 'var(--lucid-green)' }}>
                                    System Architecture
                                </span>
                                <span className="flex-1" />
                                {showArchitecture ? (
                                    <ChevronUp size={16} style={{ color: 'var(--lucid-text-muted)' }} />
                                ) : (
                                    <ChevronDown size={16} style={{ color: 'var(--lucid-text-muted)' }} />
                                )}
                            </button>

                            {/* Diagram Content */}
                            {showArchitecture && (
                                <div className="animate-in">
                                    <MermaidDiagram code={diagram} />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Architect Implementation Steps */}
                    {architect && (
                        <div className="space-y-3 animate-in mt-4">
                            <div className="flex items-center justify-between">
                                <div className="log-line log-success">✓ Architecture planned</div>
                                <button
                                    onClick={() => setExpandedSection('architect')}
                                    className="p-1.5 rounded hover:bg-white/10 text-zinc-500 hover:text-white transition-all"
                                    title="Expand architecture"
                                >
                                    <Maximize2 size={14} />
                                </button>
                            </div>
                            <div
                                className="p-3 rounded-lg"
                                style={{
                                    background: 'var(--lucid-bg)',
                                    border: '1px solid var(--lucid-border)'
                                }}
                            >
                                <pre
                                    className="whitespace-pre-wrap text-xs font-mono"
                                    style={{ color: 'var(--lucid-text-secondary)' }}
                                >
                                    {architect}
                                </pre>
                            </div>
                        </div>
                    )}

                    {/* Code Generation Complete */}
                    {files && Object.keys(files).length > 0 && !isLoading && (
                        <div className="mt-4 space-y-3 animate-in">
                            <div className="log-line log-success">✓ Code generation complete</div>
                            <div
                                className="p-3 rounded-lg"
                                style={{
                                    background: 'var(--lucid-bg)',
                                    border: '1px solid var(--lucid-border)'
                                }}
                            >
                                <div className="text-xs font-mono" style={{ color: 'var(--lucid-text-muted)' }}>
                                    <span style={{ color: 'var(--lucid-green)' }}>Generated {Object.keys(files).length} files</span>
                                    <ul className="mt-2 space-y-1">
                                        {Object.keys(files).slice(0, 10).map((path) => (
                                            <li key={path} className="flex items-center gap-2">
                                                <span style={{ color: 'var(--lucid-text-muted)' }}>•</span>
                                                <span style={{ color: 'var(--lucid-text-secondary)' }}>{path}</span>
                                            </li>
                                        ))}
                                        {Object.keys(files).length > 10 && (
                                            <li className="text-zinc-500">
                                                ... and {Object.keys(files).length - 10} more files
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            </div>
                            <div
                                className="text-xs mt-2 px-2"
                                style={{ color: 'var(--lucid-text-muted)' }}
                            >
                                View the full code in the Code tab →
                            </div>
                        </div>
                    )}

                    {/* Code Review Section */}
                    {review && (
                        <div className="mt-4 space-y-2 animate-in">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowReview(!showReview)}
                                    className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:opacity-90"
                                    style={{
                                        background: 'var(--lucid-bg)',
                                        border: '1px solid var(--lucid-border)',
                                    }}
                                >
                                    <ClipboardCheck size={16} style={{ color: '#f59e0b' }} />
                                    <span className="text-sm font-medium" style={{ color: '#f59e0b' }}>
                                        Code Review
                                    </span>
                                    <span className="flex-1" />
                                    {showReview ? (
                                        <ChevronUp size={16} style={{ color: 'var(--lucid-text-muted)' }} />
                                    ) : (
                                        <ChevronDown size={16} style={{ color: 'var(--lucid-text-muted)' }} />
                                    )}
                                </button>
                                <button
                                    onClick={() => setExpandedSection('review')}
                                    className="p-2 rounded hover:bg-white/10 text-zinc-500 hover:text-white transition-all"
                                    title="Expand review"
                                >
                                    <Maximize2 size={14} />
                                </button>
                            </div>

                            {showReview && (
                                <div
                                    className="p-3 rounded-lg animate-in"
                                    style={{
                                        background: 'var(--lucid-bg)',
                                        border: '1px solid var(--lucid-border)'
                                    }}
                                >
                                    <div
                                        className="text-xs font-mono whitespace-pre-wrap overflow-auto max-h-64"
                                        style={{ color: 'var(--lucid-text-secondary)' }}
                                    >
                                        {review}
                                    </div>
                                    <div
                                        className="mt-3 pt-2 text-xs"
                                        style={{
                                            borderTop: '1px solid var(--lucid-border)',
                                            color: 'var(--lucid-text-muted)'
                                        }}
                                    >
                                        💡 To apply these fixes, type &ldquo;Fix issues&rdquo; below
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Follow-up Messages History */}
                    {followUpMessages.map((msg, i) => (
                        <div key={i} className="mt-4 space-y-3 animate-in">
                            {/* User's follow-up prompt */}
                            <div className="flex items-start gap-2.5">
                                <div
                                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                                    style={{ background: 'var(--lucid-green)', color: '#000' }}
                                >
                                    <User size={12} strokeWidth={2.5} />
                                </div>
                                <div
                                    className="px-3 py-2 rounded-xl rounded-tl-sm text-sm max-w-[85%]"
                                    style={{
                                        background: 'var(--lucid-bg)',
                                        border: '1px solid var(--lucid-border)',
                                        color: 'var(--lucid-text-primary)',
                                    }}
                                >
                                    {msg.prompt}
                                </div>
                            </div>

                            {/* System response */}
                            {msg.response && (
                                <div className="flex items-start gap-2.5">
                                    <div
                                        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                                        style={{ background: 'var(--lucid-bg)', border: '1px solid var(--lucid-border)' }}
                                    >
                                        <Bot size={12} style={{ color: 'var(--lucid-green)' }} />
                                    </div>
                                    <div
                                        className="px-4 py-3 rounded-xl rounded-tl-sm text-sm"
                                        style={{
                                            background: 'var(--lucid-green-glow)',
                                            border: '1px solid var(--lucid-border)',
                                            color: 'var(--lucid-text-secondary)',
                                        }}
                                    >
                                        <div className="flex items-start gap-2 mb-2">
                                            <span style={{ color: 'var(--lucid-green)' }}>✓</span>
                                            <span className="font-medium" style={{ color: 'var(--lucid-green)' }}>Modifications Applied</span>
                                        </div>
                                        <div className="whitespace-pre-wrap text-[13px] leading-relaxed">
                                            {msg.response}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Modifying Spinner (in log instead of right panel) */}
                    {isFollowUpLoading && (
                        <div className="mt-4 animate-in">
                            <div className="flex items-start gap-2.5">
                                <div
                                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                                    style={{ background: 'var(--lucid-bg)', border: '1px solid var(--lucid-border)' }}
                                >
                                    <Bot size={12} style={{ color: 'var(--lucid-green)' }} />
                                </div>
                                <div
                                    className="px-3 py-2.5 rounded-xl rounded-tl-sm flex items-center gap-2"
                                    style={{
                                        background: 'var(--lucid-green-glow)',
                                        border: '1px solid var(--lucid-border)',
                                    }}
                                >
                                    <Loader2 size={14} className="animate-spin" style={{ color: 'var(--lucid-green)' }} />
                                    <span className="text-sm" style={{ color: 'var(--lucid-text-muted)' }}>
                                        Applying modifications...
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Unified Input Area */}
                <div style={{ borderTop: '1px solid var(--lucid-border)' }}>
                    <SmartInput
                        onSend={handleSubmit}
                        isLoading={isLoading || isFollowUpLoading}
                        placeholder={getPlaceholder()}
                        showHint={stage === 'idle' && !hasFiles}
                    />
                </div>
            </div>

            {/* Expandable Text Modal */}
            {
                expandedSection && (
                    <ExpandableTextModal
                        title={
                            expandedSection === 'plan' ? '📋 PROJECT PLAN' :
                                expandedSection === 'architect' ? '🏗️ ARCHITECTURE' :
                                    '🔍 CODE REVIEW'
                        }
                        content={
                            expandedSection === 'plan' ? (plan || '') :
                                expandedSection === 'architect' ? (architect || '') :
                                    (review || '')
                        }
                        accentColor={
                            expandedSection === 'review' ? '#f59e0b' : 'var(--lucid-green)'
                        }
                        onClose={() => setExpandedSection(null)}
                    />
                )
            }
        </>
    );
}

// ─── Expandable Text Modal ──────────────────────────────────────────

function ExpandableTextModal({
    title,
    content,
    accentColor,
    onClose,
}: {
    title: string;
    content: string;
    accentColor: string;
    onClose: () => void;
}) {
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[999] flex items-center justify-center"
            style={{ background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)' }}
            onClick={onClose}
        >
            <div
                className="relative w-[85vw] max-w-4xl h-[80vh] rounded-2xl border overflow-hidden flex flex-col"
                style={{ background: '#0a0a0a', borderColor: 'var(--lucid-border)' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-6 py-4 shrink-0"
                    style={{
                        background: 'rgba(10, 10, 10, 0.95)',
                        borderBottom: '1px solid var(--lucid-border)',
                        backdropFilter: 'blur(12px)',
                    }}
                >
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: accentColor }} />
                        <span className="text-sm font-mono font-semibold" style={{ color: accentColor }}>
                            {title}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-zinc-400 hover:bg-white/10 hover:text-white transition-all"
                    >
                        <X size={16} />
                        <span>Close</span>
                        <kbd className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700">ESC</kbd>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-8">
                    <pre
                        className="whitespace-pre-wrap font-mono leading-relaxed"
                        style={{ color: 'var(--lucid-text-secondary)', fontSize: '14px' }}
                    >
                        {content}
                    </pre>
                </div>
            </div>
        </div>
    );
}
