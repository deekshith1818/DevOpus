import { useEffect, useState } from 'react';
import { History, Clock, RotateCcw, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useSupabase } from './SupabaseProvider';

interface Version {
    id: string;
    version_number: number;
    prompt: string;
    created_at: string;
}

interface VersionHistorySidebarProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string | null;
    currentVersionId: string | null;
    onRevert: (versionId: string) => void;
}

export function VersionHistorySidebar({
    isOpen,
    onClose,
    projectId,
    currentVersionId,
    onRevert,
}: VersionHistorySidebarProps) {
    const [versions, setVersions] = useState<Version[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { user: _user } = useSupabase();

    // Fetch versions when sidebar opens
    useEffect(() => {
        if (isOpen && projectId) {
            fetchVersions();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, projectId]);

    const fetchVersions = async () => {
        if (!projectId) return;

        setIsLoading(true);
        try {
            const response = await fetch(`http://localhost:8000/projects/${projectId}/versions`);
            if (!response.ok) throw new Error('Failed to fetch versions');
            const data = await response.json();
            setVersions(data.versions);
        } catch (error) {
            console.error('Error fetching versions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-y-0 right-0 w-80 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l flex flex-col"
            style={{
                background: 'var(--lucid-bg-secondary)',
                borderColor: 'var(--lucid-border)',
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--lucid-border)' }}>
                <div className="flex items-center gap-2">
                    <History size={18} className="text-[var(--lucid-green)]" />
                    <h2 className="font-semibold text-white">Version History</h2>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 rounded hover:bg-white/10 transition-colors text-[var(--lucid-text-secondary)]"
                >
                    <X size={18} />
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {isLoading ? (
                    <div className="flex justify-center p-8">
                        <div className="w-6 h-6 border-2 border-[var(--lucid-green)] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : versions.length === 0 ? (
                    <div className="text-center p-8 text-[var(--lucid-text-muted)] text-sm">
                        <Clock size={32} className="mx-auto mb-2 opacity-50" />
                        <p>No history found</p>
                    </div>
                ) : (
                    versions.map((version) => (
                        <div
                            key={version.id}
                            className={`group p-3 rounded-lg border transition-all ${currentVersionId === version.id
                                ? 'border-[var(--lucid-green)] bg-[var(--lucid-green-glow)]'
                                : 'border-[var(--lucid-border)] hover:border-[var(--lucid-border-highlight)] bg-[var(--lucid-bg)]'
                                }`}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <span className="text-xs font-mono text-[var(--lucid-text-muted)] flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--lucid-green)]" />
                                    v{version.version_number || versions.length}
                                </span>
                                <span className="text-[10px] text-[var(--lucid-text-muted)]">
                                    {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                                </span>
                            </div>

                            <p className="text-sm text-white line-clamp-2 mb-3 font-light">
                                {version.prompt}
                            </p>

                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() => onRevert(version.id)}
                                    disabled={currentVersionId === version.id}
                                    className={`text-xs flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${currentVersionId === version.id
                                        ? 'opacity-50 cursor-not-allowed text-[var(--lucid-green)]'
                                        : 'hover:bg-[var(--lucid-green)]/10 text-[var(--lucid-text-secondary)] hover:text-[var(--lucid-green)]'
                                        }`}
                                >
                                    {currentVersionId === version.id ? (
                                        <>Current</>
                                    ) : (
                                        <>
                                            <RotateCcw size={12} />
                                            Revert
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
