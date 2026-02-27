'use client';

import { useEffect, useState } from 'react';
import { useSupabase } from '@/components/SupabaseProvider';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Clock, LogOut, Loader2, ArrowLeft, FolderPlus, Sparkles, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedFolder } from '@/components/ui/3d-folder';

interface Project {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

// Rotating gradient palette for folder colors
const folderGradients = [
    "linear-gradient(135deg, #10b981, #059669)",   // emerald
    "linear-gradient(135deg, #6366f1, #4f46e5)",   // indigo
    "linear-gradient(135deg, #f59e0b, #d97706)",   // amber
    "linear-gradient(135deg, #ec4899, #db2777)",   // pink
    "linear-gradient(135deg, #06b6d4, #0891b2)",   // cyan
    "linear-gradient(135deg, #a855f7, #9333ea)",   // purple
    "linear-gradient(135deg, #ef4444, #dc2626)",   // red
    "linear-gradient(135deg, #84cc16, #65a30d)",   // lime
];

export default function DashboardPage() {
    const { user, supabase, isLoading: authLoading } = useSupabase();
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/login');
            return;
        }
        fetchProjects();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, authLoading, router]);

    const fetchProjects = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const response = await fetch(`http://localhost:8000/projects/user/${user.id}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Backend error:', response.status, errorData);
                throw new Error(errorData.detail || `Server error ${response.status}`);
            }
            const data = await response.json();
            setProjects(data || []);
        } catch (err) {
            console.error('Failed to fetch projects:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Delete confirmation state
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

    const handleDeleteClick = (e: React.MouseEvent, project: Project) => {
        e.preventDefault();
        e.stopPropagation();
        setProjectToDelete(project);
    };

    const confirmDelete = async () => {
        if (!projectToDelete) return;

        const projectId = projectToDelete.id;
        setDeletingId(projectId);
        setProjectToDelete(null);

        try {
            const response = await fetch(`http://localhost:8000/projects/${projectId}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Failed to delete');
            setProjects(projects.filter((p) => p.id !== projectId));
        } catch (err) {
            console.error('Failed to delete project:', err);
        } finally {
            setDeletingId(null);
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getUserName = () => {
        if (!user?.email) return 'there';
        const name = user.email.split('@')[0];
        return name.charAt(0).toUpperCase() + name.slice(1);
    };

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
                        <Loader2 size={32} className="animate-spin text-emerald-400 relative z-10" />
                    </div>
                    <p className="text-zinc-500 text-sm animate-pulse">Loading your workspace...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative bg-zinc-950 overflow-hidden">
            {/* Background ambient glow */}
            <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-emerald-500/[0.03] rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/[0.02] rounded-full blur-[100px] pointer-events-none" />

            {/* Header */}
            <header className="relative z-10 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl sticky top-0">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="text-zinc-500 hover:text-white transition-colors">
                            <ArrowLeft size={18} />
                        </Link>
                        <div className="flex items-center gap-2.5">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5">
                                <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
                                <line x1="12" y1="22" x2="12" y2="15.5" />
                                <polyline points="22 8.5 12 15.5 2 8.5" />
                            </svg>
                            <span className="text-white font-semibold text-lg">DevOpus</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-zinc-600 text-sm hidden sm:inline">{user?.email}</span>
                        <div className="h-4 w-px bg-zinc-800 hidden sm:block" />
                        <button
                            onClick={handleSignOut}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-all text-sm"
                        >
                            <LogOut size={14} />
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-6 py-12 relative z-10">
                {/* Hero Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="mb-14"
                >
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                        <div>
                            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-white via-zinc-200 to-zinc-500 tracking-tight mb-3">
                                Welcome back, {getUserName()}.
                            </h1>
                            <p className="text-zinc-500 text-lg font-light">
                                {projects.length > 0
                                    ? `You have ${projects.length} project${projects.length > 1 ? 's' : ''} in your workspace.`
                                    : 'Ready to build something extraordinary?'}
                            </p>
                        </div>
                        <Link
                            href="/generate"
                            className="group flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
                        >
                            <Plus size={18} strokeWidth={2.5} />
                            New Project
                        </Link>
                    </div>
                </motion.div>

                {/* Empty State */}
                <AnimatePresence>
                    {projects.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-32 text-center"
                        >
                            <div className="relative mb-8">
                                <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-2xl scale-150" />
                                <div className="relative w-24 h-24 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                                    <FolderPlus size={40} strokeWidth={1} className="text-emerald-400/60" />
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Your canvas is empty</h2>
                            <p className="text-zinc-500 max-w-md mb-8 font-light">
                                Start by describing the application you want to build. Our 4-agent pipeline will architect, code, and deliver it in seconds.
                            </p>
                            <Link
                                href="/generate"
                                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-emerald-500 text-black hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                            >
                                <Sparkles size={16} />
                                Generate Your First Project
                            </Link>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Project Grid with 3D Folders */}
                {projects.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
                    >
                        {/* New Project Folder */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                        >
                            <div
                                onClick={() => router.push('/generate')}
                                className="relative flex flex-col items-center justify-center p-6 rounded-2xl cursor-pointer bg-white/[0.02] border border-dashed border-zinc-800 hover:border-emerald-500/30 hover:bg-white/[0.04] transition-all duration-500 group"
                                style={{ minHeight: "280px" }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
                                <div className="relative z-10 w-16 h-16 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center group-hover:border-emerald-500/30 group-hover:bg-emerald-500/10 transition-all duration-300 mb-4">
                                    <Plus size={28} strokeWidth={1.5} className="text-zinc-500 group-hover:text-emerald-400 transition-colors duration-300" />
                                </div>
                                <span className="relative z-10 text-zinc-500 group-hover:text-emerald-400 text-sm font-semibold transition-colors duration-300">
                                    New Project
                                </span>
                            </div>
                        </motion.div>

                        {/* Project Folders */}
                        {projects.map((project, index) => (
                            <motion.div
                                key={project.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.05 * (index + 1) }}
                                className="relative group/folder"
                            >
                                <AnimatedFolder
                                    title={project.name}
                                    subtitle={`Last edited: ${formatDate(project.updated_at)}`}
                                    gradient={folderGradients[index % folderGradients.length]}
                                    onClick={() => router.push(`/project/${project.id}`)}
                                    projects={[
                                        { id: project.id, title: project.name, image: undefined },
                                    ]}
                                />

                                {/* Delete button — sits on top of the folder */}
                                <button
                                    onClick={(e) => handleDeleteClick(e, project)}
                                    className="absolute top-3 right-3 z-40 p-2 rounded-xl opacity-0 group-hover/folder:opacity-100 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200 backdrop-blur-sm"
                                    disabled={deletingId === project.id}
                                >
                                    {deletingId === project.id ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Trash2 size={14} />
                                    )}
                                </button>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </main>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {projectToDelete && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                        onClick={() => setProjectToDelete(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ duration: 0.2 }}
                            className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-lg font-semibold text-white mb-2">Delete Project?</h3>
                            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                                Are you sure you want to delete <span className="text-white font-medium">&ldquo;{projectToDelete.name}&rdquo;</span>?
                                This action cannot be undone and will delete all generated versions.
                            </p>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setProjectToDelete(null)}
                                    className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                                >
                                    Delete Project
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
