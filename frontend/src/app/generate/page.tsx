'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ChatInterface from '@/components/ChatInterface';
import SmartInput, { AttachmentPayload } from '@/components/SmartInput';
import CodePreview from '@/components/CodePreview';
import DownloadBtn from '@/components/DownloadBtn';
import { ViewToggle } from '@/components/ui/view-toggle';
import { TextShimmerWave } from '@/components/ui/text-shimmer-wave';
import { SandpackFiles } from '@codesandbox/sandpack-react';
import { useSupabase } from '@/components/SupabaseProvider';
import { MessageSquare, Eye, History, Github, ChevronLeft } from 'lucide-react';
import { VersionHistorySidebar } from '@/components/VersionHistorySidebar';
import { uploadAsset } from '@/lib/storage';

type ViewMode = 'preview' | 'code';
type GenerationStage = 'idle' | 'planning' | 'architecting' | 'coding' | 'reviewing' | 'modifying' | 'complete';
type MobileTab = 'chat' | 'preview';

const stageMessages: Record<GenerationStage, string> = {
    idle: '',
    planning: 'Constructing a Master Plan....',
    architecting: 'Orchestrating things....',
    coding: 'Generating the code....',
    reviewing: 'Reviewing code quality....',
    modifying: 'Applying modifications....',
    complete: '',
};

export default function Home() {
    const [files, setFiles] = useState<SandpackFiles>({});
    const [isLoading, setIsLoading] = useState(false);
    const [plan, setPlan] = useState<string>('');
    const [architect, setArchitect] = useState<string>('');
    const [diagram, setDiagram] = useState<string>('');
    const [review, setReview] = useState<string>('');
    const [viewMode, setViewMode] = useState<ViewMode>('preview');
    const [sidebarWidth, setSidebarWidth] = useState(420);
    const [stage, setStage] = useState<GenerationStage>('idle');

    const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);
    const [userPrompt, setUserPrompt] = useState<string>('');
    const [followUpMessages, setFollowUpMessages] = useState<Array<{ prompt: string; response: string }>>([]);
    const [isResizing, setIsResizing] = useState(false);
    const [projectId, setProjectId] = useState<string | null>(null);
    const [mobileTab, setMobileTab] = useState<MobileTab>('chat');
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const { user, supabase, isLoading: authLoading } = useSupabase();
    const router = useRouter();



    // Auth gate: redirect to login if not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    // Robust resize handling
    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            e.preventDefault();
            // Clamp width between 280 and 700
            const newWidth = Math.max(280, Math.min(700, e.clientX));
            setSidebarWidth(newWidth);
        };

        const handleMouseUp = (e: MouseEvent) => {
            e.preventDefault();
            setIsResizing(false);
        };

        // Also handle mouse leaving the window to prevent stuck state
        const handleMouseLeave = (e: MouseEvent) => {
            // If mouse leaves the document, end resize
            if (e.clientY <= 0 || e.clientX <= 0 ||
                e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
                setIsResizing(false);
            }
        };

        // Apply resizing class to body for global cursor
        document.body.classList.add('resizing');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        // Add listeners
        document.addEventListener('mousemove', handleMouseMove, { passive: false });
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            // Cleanup
            document.body.classList.remove('resizing');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [isResizing]);

    const startResize = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    };

    // Generate handler - uses streaming endpoint for real-time updates
    const handleGenerate = async (prompt: string, attachments: AttachmentPayload) => {
        setIsLoading(true);
        setPlan('');
        setArchitect('');
        setDiagram('');
        setFiles({});
        setStage('planning');
        setUserPrompt(prompt);
        setFollowUpMessages([]);

        // Log attachments for debugging
        console.log('Generating with attachments:', {
            images: attachments.images.length,
            pdf: attachments.pdf?.name
        });

        try {
            // Build attachment payload for backend
            // Send first image for now (backend can be extended for multiple)
            const primaryImage = attachments.images[0] || null;
            const attachment = primaryImage || attachments.pdf;

            // Upload asset if present (NEW PIPELINE)
            let imageAssetUrl = null;
            if (primaryImage) {
                console.log('Uploading asset to storage...');
                imageAssetUrl = await uploadAsset(primaryImage.data, primaryImage.name, primaryImage.mimeType);
                if (imageAssetUrl) console.log('Asset uploaded:', imageAssetUrl);
            }

            const response = await fetch('http://localhost:8000/generate-stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    attachment: attachment ? {
                        name: attachment.name,
                        type: attachment.type,
                        data: attachment.data,
                        mimeType: attachment.mimeType
                    } : null,
                    // Also send all images for future multi-image support
                    images: attachments.images.map(img => ({
                        name: img.name,
                        type: img.type,
                        data: img.data,
                        mimeType: img.mimeType
                    })),
                    user_id: user?.id || null,
                    project_id: projectId,
                    image_asset_url: imageAssetUrl, // Pass persistent URL
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate code');
            }

            // Read the SSE stream
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                throw new Error('No response body');
            }

            let buffer = '';
            let latestFiles: Record<string, any> = {}; // Local var to track files across SSE events (avoids React stale closure)

            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // Process complete SSE events (lines starting with "data: ")
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));

                            // Handle different stages
                            switch (data.stage) {
                                case 'planning':
                                    setStage('planning');
                                    break;

                                case 'plan_complete':
                                    if (data.plan) {
                                        setPlan(data.plan);
                                    }
                                    break;

                                case 'architecting':
                                    setStage('architecting');
                                    break;

                                case 'architect_complete':
                                    if (data.architect) {
                                        setArchitect(data.architect);
                                    }
                                    if (data.diagram) {
                                        setDiagram(data.diagram);
                                    }
                                    break;

                                case 'coding':
                                    setStage('coding');
                                    break;

                                case 'coding_complete':
                                    if (data.files) {
                                        latestFiles = data.files;
                                        setFiles(data.files);
                                    }
                                    break;

                                case 'reviewing':
                                    setStage('reviewing');
                                    break;

                                case 'complete':
                                    if (data.files) {
                                        latestFiles = data.files;
                                        setFiles(data.files);
                                    }
                                    if (data.review) {
                                        setReview(data.review);
                                    }
                                    setStage('complete');
                                    break;

                                case 'error':
                                    console.error('Stream error:', data.message);
                                    setPlan(`Error: ${data.message}`);
                                    setStage('idle');
                                    break;

                                case 'saved':
                                    if (data.project_id) {
                                        setProjectId(data.project_id);
                                        // Update URL to include project ID without full navigation
                                        window.history.replaceState({}, '', `/project/${data.project_id}`);

                                        // Backup: also save code_snapshot in the mandatory format via POST /projects/save
                                        if (user?.id) {
                                            try {
                                                // Use local variable `latestFiles` — avoids React stale closure
                                                const currentFiles = latestFiles;
                                                console.log('Backup save: files count =', Object.keys(currentFiles).length);
                                                const codeSnapshot = {
                                                    files: Object.fromEntries(
                                                        Object.entries(currentFiles).map(([path, content]) => [
                                                            path,
                                                            typeof content === 'string' ? { code: content } : content
                                                        ])
                                                    )
                                                };
                                                fetch('http://localhost:8000/projects/save', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                        user_id: user.id,
                                                        name: prompt.slice(0, 50),
                                                        description: prompt,
                                                        code_snapshot: codeSnapshot,
                                                        project_id: data.project_id
                                                    })
                                                }).catch(console.error);
                                            } catch {
                                                // Non-fatal backup save
                                            }
                                        }
                                    }
                                    break;
                            }
                        } catch {
                            console.warn('Failed to parse SSE data:', line);
                        }
                    }
                }
            }

        } catch (error) {
            console.error('Error:', error);
            setPlan('Error: Failed to generate code. Check the backend console.');
            setStage('idle');
        } finally {
            setIsLoading(false);
        }
    };



    // Revert handler
    const handleRevert = async (versionId: string) => {
        try {
            const response = await fetch(`http://localhost:8000/versions/${versionId}`);
            if (!response.ok) throw new Error('Failed to fetch version');
            const version = await response.json();

            if (version.code_snapshot) {
                setFiles(version.code_snapshot);
                setCurrentVersionId(versionId);
                // Reset stage to complete so user can follow up from here
                setStage('complete');
                setPlan(`Restored to version from ${new Date(version.created_at).toLocaleTimeString()}`);
            }
        } catch (error) {
            console.error('Revert error:', error);
        }
    };

    // GitHub Export Handler
    const handleExportToGithub = async () => {
        if (!user || !projectId) return;

        setIsExporting(true);
        try {
            // Get session to retrieve provider token
            const { data: { session } } = await supabase.auth.getSession();
            const githubToken = session?.provider_token;

            if (!githubToken) {
                // Redirect to GitHub login
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'github',
                    options: {
                        scopes: 'repo',
                        redirectTo: window.location.href,
                    },
                });

                if (error) {
                    console.error('GitHub login error:', error);
                    alert('Failed to initiate GitHub login');
                }
                setIsExporting(false);
                return;
            }

            const response = await fetch('http://localhost:8000/api/export-to-github', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_id: projectId,
                    github_token: githubToken
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Export failed');
            }

            const data = await response.json();
            // Open new repo in new tab
            window.open(data.repo_url, '_blank');

        } catch (error) {
            console.error('GitHub Export Error:', error);
            alert(`Failed to export: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsExporting(false);
        }
    };

    // Follow-up handler - sends modification request directly to coder agent
    const handleFollowUp = async (prompt: string, attachments: AttachmentPayload) => {
        const hasContent = prompt.trim() || attachments.images.length > 0 || attachments.pdf;
        if (!hasContent || Object.keys(files).length === 0) return;

        // Add user's message to the chat immediately
        setFollowUpMessages(prev => [...prev, { prompt: prompt.trim(), response: '' }]);
        setIsFollowUpLoading(true);
        setStage('modifying');

        try {
            // Build attachment for follow-up (use first image or PDF)
            const primaryImage = attachments.images[0] || null;
            const attachment = primaryImage || attachments.pdf;

            const response = await fetch('http://localhost:8000/followup-stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    current_files: files,
                    review_feedback: review,
                    attachment: attachment ? {
                        name: attachment.name,
                        type: attachment.type,
                        data: attachment.data,
                        mimeType: attachment.mimeType
                    } : null,
                    user_id: user?.id || null,
                    project_id: projectId,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to apply modifications');
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                throw new Error('No response body');
            }

            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));

                            switch (data.stage) {
                                case 'modifying':
                                    setStage('modifying');
                                    break;

                                case 'complete':
                                    if (data.files) {
                                        setFiles(data.files);
                                    }
                                    setStage('complete');
                                    // Add response to the last follow-up message
                                    setFollowUpMessages(prev => {
                                        const updated = [...prev];
                                        if (updated.length > 0) {
                                            updated[updated.length - 1].response = data.summary || 'Modifications applied successfully.';
                                        }
                                        return updated;
                                    });

                                    break;

                                case 'error':
                                    console.error('Follow-up error:', data.message);
                                    setStage('complete');
                                    break;
                            }
                        } catch {
                            console.warn('Failed to parse SSE data:', line);
                        }
                    }
                }
            }

        } catch (error) {
            console.error('Follow-up Error:', error);
            setStage('complete');
        } finally {
            setIsFollowUpLoading(false);
        }
    };

    // Get status text for header
    const getStatusText = () => {
        if (stage === 'complete' && Object.keys(files).length > 0) {
            return 'Generated Output';
        }
        if (isLoading) {
            return stageMessages[stage] ? 'Processing...' : 'Waiting for input...';
        }
        return 'Waiting for input...';
    };

    // Auto-switch to Preview tab on mobile when code generation completes
    useEffect(() => {
        if (stage === 'complete' && Object.keys(files).length > 0) {
            setMobileTab('preview');
        }
    }, [stage, files]);

    // Show loading while auth is being resolved
    if (authLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center" style={{ background: 'var(--lucid-bg)' }}>
                <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: 'var(--lucid-green)', borderTopColor: 'transparent' }}
                />
            </div>
        );
    }

    return (
        <div className="relative w-full h-[100dvh] bg-[#050505] overflow-hidden">
            {/* ─── MOBILE LAYOUT (< 1024px) ─────────────────────────────────────── */}
            <div className="flex lg:hidden flex-col h-full w-full relative">

                {/* Floating Back Button (Mobile Preview only) */}
                {mobileTab !== 'chat' && (
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="absolute top-4 left-4 z-50 p-2 rounded-full bg-zinc-900/80 backdrop-blur-md border border-zinc-800 shadow-xl text-zinc-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                )}

                {/* Floating View Toggle */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex w-44 h-10 p-1 rounded-full bg-zinc-900/80 backdrop-blur-md border border-zinc-800 shadow-2xl">
                    <div className="flex items-center w-full relative">
                        {/* Sliding background pill */}
                        <div
                            className="absolute left-0 h-8 w-1/2 rounded-full transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                            style={{
                                transform: mobileTab === 'chat' ? 'translateX(0%)' : 'translateX(100%)',
                                backgroundColor: '#22c55e',
                            }}
                        />

                        {/* Chat button */}
                        <button
                            onClick={() => setMobileTab('chat')}
                            className={`flex justify-center items-center z-10 w-1/2 h-8 rounded-full text-xs font-semibold transition-colors duration-300 ${mobileTab === 'chat' ? 'text-black' : 'text-zinc-400 hover:text-white'}`}
                        >
                            Chat
                        </button>

                        {/* Preview button */}
                        <button
                            onClick={() => setMobileTab('preview')}
                            className={`flex justify-center items-center z-10 w-1/2 h-8 rounded-full text-xs font-semibold transition-colors duration-300 ${mobileTab === 'preview' ? 'text-black' : 'text-zinc-400 hover:text-white'}`}
                        >
                            Preview
                        </button>
                    </div>
                </div>

                {/* Main Content Area filling available space above input */}
                {mobileTab !== 'chat' && (
                    <div className="flex-1 relative overflow-hidden bg-[#050505]">
                        <div className="absolute inset-x-0 bottom-0 top-[60px]">
                            <CodePreview files={files} mode="preview" />
                        </div>
                        {/* Empty state when viewing preview with no files */}
                        {Object.keys(files).length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center bg-[#050505] pt-[60px]">
                                <p className="text-zinc-500 text-sm">Generated code will appear here</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Chat / Persistent Input */}
                <div className={`${mobileTab === 'chat' ? 'flex-1 pt-[60px]' : 'shrink-0 pb-safe z-40 bg-zinc-900/80 backdrop-blur-2xl border-t border-zinc-800/80'} flex flex-col overflow-hidden`}>
                    <ChatInterface
                        className={`h-full flex-col ${mobileTab !== 'chat' ? '[&>div:nth-child(1)]:hidden [&>div:nth-child(2)]:hidden' : ''}`}
                        onGenerate={handleGenerate}
                        onFollowUp={handleFollowUp}
                        isLoading={isLoading}
                        isFollowUpLoading={isFollowUpLoading}
                        plan={plan}
                        architect={architect}
                        diagram={diagram}
                        files={files as Record<string, string>}
                        review={review}
                        stage={stage}
                        userPrompt={userPrompt}
                        followUpMessages={followUpMessages}
                    />
                </div>
            </div>

            {/* ─── DESKTOP LAYOUT (≥ 1024px) ── unchanged ───────────────────────── */}
            <div className="hidden lg:flex h-full w-full overflow-hidden" style={{ background: 'var(--lucid-bg)' }}>
                {/* Left Sidebar - Intelligence Console */}
                <div
                    className="h-full flex flex-col shrink-0"
                    style={{
                        width: sidebarWidth,
                        background: 'var(--lucid-bg-secondary)',
                        borderRight: '1px solid var(--lucid-border)'
                    }}
                >
                    <ChatInterface
                        onGenerate={handleGenerate}
                        onFollowUp={handleFollowUp}
                        isLoading={isLoading}
                        isFollowUpLoading={isFollowUpLoading}
                        plan={plan}
                        architect={architect}
                        diagram={diagram}
                        files={files as Record<string, string>}
                        review={review}
                        stage={stage}
                        userPrompt={userPrompt}
                        followUpMessages={followUpMessages}
                    />
                </div>

                {/* Resize Handle */}
                <div
                    className="resize-handle h-full"
                    onMouseDown={startResize}
                />

                {/* Right Area - Output */}
                <div className="flex-1 h-full flex flex-col min-w-0" style={{ background: 'var(--lucid-bg)' }}>
                    {/* Header with Toggle */}
                    <div
                        className="flex items-center justify-between px-5 py-3"
                        style={{ borderBottom: '1px solid var(--lucid-border)' }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full" style={{ background: '#ef4444' }} />
                                <div className="w-3 h-3 rounded-full" style={{ background: '#f59e0b' }} />
                                <div className="w-3 h-3 rounded-full" style={{ background: '#22c55e' }} />
                            </div>
                            <span style={{ color: 'var(--lucid-text-muted)', fontSize: '13px' }}>
                                {getStatusText()}
                            </span>
                        </div>

                        {/* View Toggle and Export */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsHistoryOpen(true)}
                                className="p-2 rounded hover:bg-white/5 text-[var(--lucid-text-secondary)] hover:text-white transition-colors"
                                title="Version History"
                            >
                                <History size={18} />
                            </button>
                            {Object.keys(files).length > 0 && (
                                <>
                                    <button
                                        onClick={handleExportToGithub}
                                        disabled={isExporting}
                                        className="p-2 rounded hover:bg-white/5 text-[var(--lucid-text-secondary)] hover:text-white transition-colors"
                                        title="Export to GitHub"
                                    >
                                        {isExporting ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <Github size={18} />
                                        )}
                                    </button>
                                    <DownloadBtn files={files as Record<string, string>} />
                                </>
                            )}
                            <ViewToggle mode={viewMode} onModeChange={setViewMode} />
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 flex flex-col overflow-hidden relative">
                        {/* Resize Overlay */}
                        {isResizing && (
                            <div
                                className="absolute inset-0 z-50"
                                style={{
                                    cursor: 'col-resize',
                                    background: 'rgba(5, 5, 5, 0.3)'
                                }}
                            />
                        )}

                        {Object.keys(files).length > 0 ? (
                            <div className="flex-1 overflow-hidden">
                                <CodePreview files={files} mode={viewMode} />
                            </div>
                        ) : (
                            <div
                                className="flex h-full items-center justify-center"
                                style={{ background: 'var(--lucid-bg)' }}
                            >
                                <div className="text-center">
                                    {isLoading && stageMessages[stage] ? (
                                        <div className="space-y-6">
                                            <div
                                                className="w-20 h-20 mx-auto rounded-full flex items-center justify-center animate-pulse"
                                                style={{ background: 'var(--lucid-green-glow)', border: '1px solid var(--lucid-border)' }}
                                            >
                                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--lucid-green)" strokeWidth="1.5">
                                                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                                    <path d="M2 17l10 5 10-5" />
                                                    <path d="M2 12l10 5 10-5" />
                                                </svg>
                                            </div>
                                            <TextShimmerWave
                                                className="font-mono text-lg"
                                                duration={1.2}
                                                spread={1.5}
                                            >
                                                {stageMessages[stage]}
                                            </TextShimmerWave>
                                        </div>
                                    ) : (
                                        <>
                                            <div
                                                className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                                                style={{ background: 'var(--lucid-green-glow)', border: '1px solid var(--lucid-border)' }}
                                            >
                                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--lucid-green)" strokeWidth="1.5">
                                                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                                    <path d="M2 17l10 5 10-5" />
                                                    <path d="M2 12l10 5 10-5" />
                                                </svg>
                                            </div>
                                            <p style={{ color: 'var(--lucid-text-muted)', fontSize: '14px' }}>
                                                Generated preview will appear here
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {/* Version History Sidebar */}
                <VersionHistorySidebar
                    isOpen={isHistoryOpen}
                    onClose={() => setIsHistoryOpen(false)}
                    projectId={projectId}
                    currentVersionId={currentVersionId}
                    onRevert={handleRevert}
                />
            </div>
        </div>
    );
}
