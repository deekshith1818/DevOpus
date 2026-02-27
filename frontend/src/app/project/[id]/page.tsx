'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import ChatInterface from '@/components/ChatInterface';
import { AttachmentPayload } from '@/components/SmartInput';
import CodePreview from '@/components/CodePreview';
import DownloadBtn from '@/components/DownloadBtn';
import { ViewToggle } from '@/components/ui/view-toggle';

import { SandpackFiles } from '@codesandbox/sandpack-react';
import { useSupabase } from '@/components/SupabaseProvider';
import { Loader2, History, Github, ChevronLeft } from 'lucide-react';
import { VersionHistorySidebar } from '@/components/VersionHistorySidebar';
import { uploadAsset } from '@/lib/storage';

type ViewMode = 'preview' | 'code';
type GenerationStage = 'idle' | 'planning' | 'architecting' | 'coding' | 'reviewing' | 'modifying' | 'complete';

const _stageMessages: Record<GenerationStage, string> = {
    idle: '',
    planning: 'Constructing a Master Plan....',
    architecting: 'Orchestrating things....',
    coding: 'Generating the code....',
    reviewing: 'Reviewing code quality....',
    modifying: 'Applying modifications....',
    complete: '',
};

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: projectId } = use(params);
    const [files, setFiles] = useState<SandpackFiles>({});
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingProject, setIsFetchingProject] = useState(true);
    const [plan, setPlan] = useState<string>('');
    const [architect, setArchitect] = useState<string>('');
    const [diagram, setDiagram] = useState<string>('');
    const [review, setReview] = useState<string>('');
    const [viewMode, setViewMode] = useState<ViewMode>('preview');
    const [sidebarWidth, setSidebarWidth] = useState(420);
    const [stage, setStage] = useState<GenerationStage>('idle');
    const [initialPrompt, setInitialPrompt] = useState<string>('');
    const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);
    const [followUpMessages, setFollowUpMessages] = useState<Array<{ prompt: string; response: string }>>([]);
    const [isResizing, setIsResizing] = useState(false);
    type MobileTab = 'chat' | 'preview' | 'code';
    const [mobileTab, setMobileTab] = useState<MobileTab>('chat');
    const [projectName, setProjectName] = useState('');
    const [fetchError, setFetchError] = useState('');
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [currentVersionId, setCurrentVersionId] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            return sessionStorage.getItem(`devopus-version-${projectId}`) || null;
        }
        return null;
    });
    const [isExporting, setIsExporting] = useState(false);
    const { user, supabase, isLoading: isAuthLoading } = useSupabase();
    const router = useRouter();

    // Load project from backend API on mount
    useEffect(() => {
        async function loadProject() {
            if (isAuthLoading) return; // Wait for auth to resolve

            if (!user) {
                // If auth loaded but no user, redirect to login
                router.push('/login');
                return;
            }

            try {
                // Fetch project with code_snapshot from backend
                const response = await fetch(`http://localhost:8000/projects/single/${projectId}`);
                if (!response.ok) {
                    setFetchError('Project not found');
                    setIsFetchingProject(false);
                    return;
                }
                const projectData = await response.json();

                setProjectName(projectData.name || 'Untitled');

                // Load code_snapshot from the project row
                if (projectData.code_snapshot) {
                    const snapshot = projectData.code_snapshot;
                    // Support both { files: { "/App.tsx": { code: "..." } } } format
                    // and raw { "/App.tsx": "..." } format
                    if (snapshot.files) {
                        setFiles(snapshot.files);
                    } else {
                        setFiles(snapshot);
                    }
                    setStage('complete');
                }

                // Load agent outputs: prefer dedicated columns, then code_snapshot inner keys
                const snap = projectData.code_snapshot || {};
                const planText = projectData.plan_snapshot || snap.plan_snapshot || '';
                const archText = projectData.architect_snapshot || snap.architect_snapshot || '';
                const diagText = projectData.diagram_snapshot || snap.diagram_snapshot || '';
                const revText = projectData.review_snapshot || snap.review_snapshot || '';
                const promptText = snap.prompt || '';

                if (planText) setPlan(planText);
                if (archText) setArchitect(archText);
                if (diagText) setDiagram(diagText);
                if (revText) setReview(revText);
                if (promptText) setInitialPrompt(promptText);

                // Fallback: try loading from latest version (for very old projects)
                if (!planText && !archText) {
                    try {
                        const versionRes = await fetch(`http://localhost:8000/projects/${projectId}/latest`);
                        if (versionRes.ok) {
                            const versionData = await versionRes.json();
                            if (versionData.plan_snapshot) setPlan(versionData.plan_snapshot);
                            if (versionData.architect_snapshot) setArchitect(versionData.architect_snapshot);
                            if (versionData.diagram_snapshot) setDiagram(versionData.diagram_snapshot);
                            if (versionData.review_snapshot) setReview(versionData.review_snapshot);
                        }
                    } catch {
                        // Non-fatal — version data is supplementary
                    }
                }

                // Load chat history from versions
                try {
                    const versionsRes = await fetch(`http://localhost:8000/projects/${projectId}/versions`);
                    if (versionsRes.ok) {
                        const { versions } = await versionsRes.json();
                        if (versions && versions.length > 0) {
                            // Versions are sorted desc, reverse for chronological
                            const sorted = [...versions].reverse();
                            setInitialPrompt(sorted[0].prompt || '');
                            if (sorted.length > 1) {
                                const history = sorted.slice(1).map((v: { prompt?: string; summary?: string }) => ({
                                    prompt: v.prompt || '',
                                    response: v.summary || 'Modifications applied successfully.'
                                }));
                                setFollowUpMessages(history);
                            }
                        }
                    }
                } catch {
                    // Non-fatal
                }
            } catch (err) {
                console.error('Failed to load project:', err);
                setFetchError('Failed to load project.');
            } finally {
                setIsFetchingProject(false);
            }
        }

        loadProject();
    }, [projectId, user, isAuthLoading, router]);

    // Resize handling
    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            e.preventDefault();
            const newWidth = Math.max(280, Math.min(700, e.clientX));
            setSidebarWidth(newWidth);
        };

        const handleMouseUp = (e: MouseEvent) => {
            e.preventDefault();
            setIsResizing(false);
        };

        const handleMouseLeave = (e: MouseEvent) => {
            if (e.clientY <= 0 || e.clientX <= 0 ||
                e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
                setIsResizing(false);
            }
        };

        document.body.classList.add('resizing');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        document.addEventListener('mousemove', handleMouseMove, { passive: false });
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('mouseleave', handleMouseLeave);

        return () => {
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

    // GitHub Export
    const handleExportToGithub = async () => {
        if (!user || !supabase) return;
        setIsExporting(true);
        try {
            // Get the session to extract the GitHub provider token
            const { data: sessionData } = await supabase.auth.getSession();
            const providerToken = sessionData?.session?.provider_token;

            if (!providerToken) {
                // User logged in with email/Google, not GitHub — prompt re-login
                const confirmReLogin = window.confirm(
                    'To push to GitHub, you need to sign in with GitHub.\n\nWould you like to sign in with GitHub now?'
                );
                if (confirmReLogin) {
                    await supabase.auth.signInWithOAuth({
                        provider: 'github',
                        options: {
                            redirectTo: `${window.location.origin}/project/${projectId}`,
                            scopes: 'repo',
                        },
                    });
                }
                return;
            }

            const response = await fetch('http://localhost:8000/api/export-to-github', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_id: projectId,
                    github_token: providerToken,
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to push to GitHub');
            }

            const data = await response.json();
            window.open(data.repo_url, '_blank');
            alert(`✅ Repository created!\n\n${data.repo_url}`);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('GitHub export error:', message);
            alert(`❌ GitHub export failed:\n${message}`);
        } finally {
            setIsExporting(false);
        }
    };

    // Auto-switch to Preview tab on mobile when code generation completes
    useEffect(() => {
        if (stage === 'complete' && Object.keys(files).length > 0) {
            setMobileTab('preview');
        }
    }, [stage, files]);

    // Follow-up handler
    const handleFollowUp = async (prompt: string, attachments: AttachmentPayload) => {
        const hasContent = prompt.trim() || attachments.images.length > 0 || attachments.pdf;
        if (!hasContent || Object.keys(files).length === 0) return;

        // Add user's message to the chat immediately
        setFollowUpMessages(prev => [...prev, { prompt: prompt.trim(), response: '' }]);
        setIsFollowUpLoading(true);
        setStage('modifying');

        try {
            const primaryImage = attachments.images[0] || null;
            const attachment = primaryImage || attachments.pdf;

            // Upload asset if present (NEW PIPELINE)
            let imageAssetUrl = null;
            if (primaryImage) {
                console.log('Uploading asset to storage...');
                imageAssetUrl = await uploadAsset(primaryImage.data, primaryImage.name, primaryImage.mimeType);
                if (imageAssetUrl) console.log('Asset uploaded:', imageAssetUrl);
            }

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
                    image_asset_url: imageAssetUrl, // Pass persistent URL
                }),
            });

            if (!response.ok) throw new Error('Failed to apply modifications');

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            if (!reader) throw new Error('No response body');

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
                                    if (data.files) setFiles(data.files);
                                    setStage('complete');
                                    // Clear stored version — new follow-up creates a new latest version
                                    sessionStorage.removeItem(`devopus-version-${projectId}`);
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

    // Revert handler
    const handleRevert = async (versionId: string) => {
        try {
            const response = await fetch(`http://localhost:8000/versions/${versionId}`);
            if (!response.ok) throw new Error('Failed to fetch version');
            const version = await response.json();

            if (version.code_snapshot) {
                setFiles(version.code_snapshot);
                setCurrentVersionId(versionId);
                // Persist the selected version so it survives refresh
                sessionStorage.setItem(`devopus-version-${projectId}`, versionId);
                // Reset stage to complete so user can follow up from here
                setStage('complete');
                setPlan(`Restored to version from ${new Date(version.created_at).toLocaleTimeString()}`);
            }
        } catch (error) {
            console.error('Revert error:', error);
        }
    };


    const getStatusText = () => {
        if (stage === 'complete' && Object.keys(files).length > 0) return projectName || 'Project';
        if (isLoading) return 'Processing...';
        return projectName || 'Loading...';
    };

    // Loading state
    if (isFetchingProject) {
        return (
            <div className="flex h-screen w-full items-center justify-center" style={{ background: '#050505' }}>
                <div className="flex flex-col items-center gap-3">
                    <Loader2 size={28} className="animate-spin text-[#22c55e]" />
                    <p className="text-gray-500 text-sm">Loading project...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (fetchError) {
        return (
            <div className="flex h-screen w-full items-center justify-center" style={{ background: '#050505' }}>
                <div className="text-center">
                    <p className="text-gray-400 mb-4">{fetchError}</p>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
                        style={{ background: '#22c55e', color: '#000' }}
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // ─── DESKTOP & MOBILE LAYOUT ───────────────────────────────────────
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
                        {/* Empty state when viewing preview width no files */}
                        {Object.keys(files).length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center bg-[#050505] pt-[60px]">
                                <div className="text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'var(--lucid-green-glow)', border: '1px solid var(--lucid-border)' }}>
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--lucid-green)" strokeWidth="1.5">
                                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                            <path d="M2 17l10 5 10-5" />
                                            <path d="M2 12l10 5 10-5" />
                                        </svg>
                                    </div>
                                    <p className="text-zinc-500 text-sm">No code snapshot found</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Chat / Persistent Input */}
                <div className={`${mobileTab === 'chat' ? 'flex-1 pt-[60px]' : 'shrink-0 pb-safe z-40 bg-zinc-900/80 backdrop-blur-2xl border-t border-zinc-800/80'} flex flex-col overflow-hidden`}>
                    <ChatInterface
                        className={`h-full flex-col ${mobileTab !== 'chat' ? '[&>div:nth-child(1)]:hidden [&>div:nth-child(2)]:hidden' : ''}`}
                        onGenerate={async () => { }}
                        onFollowUp={handleFollowUp}
                        isLoading={isLoading}
                        isFollowUpLoading={isFollowUpLoading}
                        plan={plan}
                        architect={architect}
                        diagram={diagram}
                        files={files as Record<string, string>}
                        review={review}
                        stage={stage}
                        userPrompt={initialPrompt}
                        followUpMessages={followUpMessages}
                    />
                </div>
            </div>

            {/* ─── DESKTOP LAYOUT (≥ 1024px) ── unchanged ───────────────────────── */}
            <div className="hidden lg:flex h-full w-full overflow-hidden" style={{ background: 'var(--lucid-bg)' }}>
                {/* Left Sidebar */}
                <div
                    className="h-full flex flex-col shrink-0"
                    style={{
                        width: sidebarWidth,
                        background: 'var(--lucid-bg-secondary)',
                        borderRight: '1px solid var(--lucid-border)'
                    }}
                >
                    <ChatInterface
                        onGenerate={async () => { }}
                        onFollowUp={handleFollowUp}
                        isLoading={isLoading}
                        isFollowUpLoading={isFollowUpLoading}
                        plan={plan}
                        architect={architect}
                        diagram={diagram}
                        files={files as Record<string, string>}
                        review={review}
                        stage={stage}
                        userPrompt={initialPrompt}
                        followUpMessages={followUpMessages}
                    />
                </div>

                {/* Resize Handle */}
                <div className="resize-handle h-full" onMouseDown={startResize} />

                {/* Right Area */}
                <div className="flex-1 h-full flex flex-col min-w-0" style={{ background: 'var(--lucid-bg)' }}>
                    {/* Header */}
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

                    {/* Content */}
                    <div className="flex-1 flex flex-col overflow-hidden relative">
                        {isResizing && (
                            <div
                                className="absolute inset-0 z-50"
                                style={{ cursor: 'col-resize', background: 'rgba(5, 5, 5, 0.3)' }}
                            />
                        )}

                        {Object.keys(files).length > 0 ? (
                            <div className="flex-1 overflow-hidden">
                                <CodePreview files={files} mode={viewMode} />
                            </div>
                        ) : (
                            <div className="flex h-full items-center justify-center p-8 text-center" style={{ background: 'var(--lucid-bg)' }}>
                                <div className="max-w-md">
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
                                        {stage === 'modifying'
                                            ? 'Applying modifications...'
                                            : 'No code snapshot found for this project'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <VersionHistorySidebar
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                projectId={projectId}
                currentVersionId={currentVersionId}
                onRevert={handleRevert}
            />
        </div>
    );
}
