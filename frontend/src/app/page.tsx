'use client';

import { useState, useRef, useCallback, useEffect, MouseEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import {
    ArrowRight, Sparkles, Zap,
    Bot, PenTool, Braces, Eye,
    ChevronDown, Linkedin, CheckCircle2,
    Menu, X, Instagram, Github
} from 'lucide-react';
import { useSupabase } from '@/components/SupabaseProvider';
import { createClient } from '@/lib/supabase';
import { HeroParallax } from '@/components/ui/hero-parallax';
import { AnimatedHeroCard } from '@/components/ui/animated-hero-card';

// --- Reusable SpotlightCard ---
const SpotlightCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => {
    const cardRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
        const card = cardRef.current;
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--spotlight-x', `${x}px`);
        card.style.setProperty('--spotlight-y', `${y}px`);
    }, []);

    const handleMouseLeave = useCallback(() => {
        const card = cardRef.current;
        if (!card) return;
        card.style.removeProperty('--spotlight-x');
        card.style.removeProperty('--spotlight-y');
    }, []);

    return (
        <motion.div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            whileHover={{ scale: 1.03 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={`group/spotlight relative ${className}`}
            style={{
                // The spotlight overlay via pseudo-element needs inline fallback
            }}
        >
            {/* Mouse-following spotlight overlay */}
            <div
                className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] opacity-0 group-hover/spotlight:opacity-100 transition-opacity duration-500"
                style={{
                    background: 'radial-gradient(350px circle at var(--spotlight-x, 50%) var(--spotlight-y, 50%), rgba(16, 185, 129, 0.08), transparent 60%)',
                }}
            />
            {/* Mouse-following border glow */}
            <div
                className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] opacity-0 group-hover/spotlight:opacity-100 transition-opacity duration-500"
                style={{
                    background: 'radial-gradient(400px circle at var(--spotlight-x, 50%) var(--spotlight-y, 50%), rgba(16, 185, 129, 0.15), transparent 60%)',
                    mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    maskComposite: 'exclude',
                    WebkitMaskComposite: 'xor',
                    padding: '1px',
                }}
            />
            {children}
        </motion.div>
    );
};

// --- Reusable FadeUp Component ---
const FadeUp = ({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) => (
    <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
        className={className}
    >
        {children}
    </motion.div>
);

// --- Footer Text Hover Reveal ---
const FooterTextReveal = () => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [hovered, setHovered] = useState(false);
    const [maskPos, setMaskPos] = useState({ cx: '50%', cy: '50%' });

    const handleMouseMove = useCallback((e: MouseEvent<SVGSVGElement>) => {
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const cx = `${((e.clientX - rect.left) / rect.width) * 100}%`;
        const cy = `${((e.clientY - rect.top) / rect.height) * 100}%`;
        setMaskPos({ cx, cy });
    }, []);

    return (
        <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox="0 0 500 120"
            xmlns="http://www.w3.org/2000/svg"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onMouseMove={handleMouseMove}
            className="select-none max-w-[95vw] sm:max-w-[90vw] cursor-default"
        >
            <defs>
                <linearGradient id="greenGradient" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="450" y2="0">
                    {hovered && (
                        <>
                            <stop offset="0%" stopColor="#059669" />
                            <stop offset="25%" stopColor="#10b981" />
                            <stop offset="50%" stopColor="#34d399" />
                            <stop offset="75%" stopColor="#6ee7b7" />
                            <stop offset="100%" stopColor="#10b981" />
                        </>
                    )}
                </linearGradient>
                <radialGradient
                    id="revealMask"
                    gradientUnits="userSpaceOnUse"
                    r="30%"
                    cx={maskPos.cx}
                    cy={maskPos.cy}
                >
                    <stop offset="0%" stopColor="white" />
                    <stop offset="100%" stopColor="black" />
                </radialGradient>
                <mask id="textRevealMask">
                    <rect x="0" y="0" width="100%" height="100%" fill="url(#revealMask)" />
                </mask>
            </defs>

            {/* Layer 1: Base outline - always visible */}
            <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="middle"
                strokeWidth="0.5"
                className="fill-transparent text-[22vw] sm:text-[14vw] md:text-[90px]"
                stroke="rgba(16, 185, 129, 0.2)"
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 800, letterSpacing: '-0.05em' }}
            >
                DevOpus
            </text>

            {/* Layer 2: Animated stroke dash (draws on mount) */}
            <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="middle"
                strokeWidth="0.5"
                className="fill-transparent text-[22vw] sm:text-[14vw] md:text-[90px]"
                stroke="rgba(16, 185, 129, 0.3)"
                style={{
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontWeight: 800,
                    letterSpacing: '-0.05em',
                    strokeDasharray: 1000,
                    strokeDashoffset: 1000,
                    animation: 'dash-draw 4s ease-in-out forwards',
                }}
            >
                DevOpus
            </text>

            {/* Layer 3: Gradient reveal on hover */}
            <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="middle"
                strokeWidth="1"
                className="fill-transparent text-[22vw] sm:text-[14vw] md:text-[90px]"
                stroke="url(#greenGradient)"
                mask="url(#textRevealMask)"
                style={{
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontWeight: 800,
                    letterSpacing: '-0.05em',
                    transition: 'all 0.3s ease',
                }}
            >
                DevOpus
            </text>
        </svg>
    );
};

export default function HomePage() {
    const { user, isLoading } = useSupabase();
    const router = useRouter();
    const [openFaq, setOpenFaq] = useState<number | null>(0);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Prevent scrolling when mobile menu is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isMobileMenuOpen]);

    // Scroll-driven 3D reveal for hero card
    const heroRef = useRef<HTMLDivElement>(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const { scrollYProgress: heroScroll } = useScroll({
        target: heroRef,
        offset: ['start end', 'end start'],
    });

    const heroRotateX = useTransform(heroScroll, [0, 0.5], [isMobile ? 10 : 20, 0]);
    const heroScale = useTransform(heroScroll, [0, 0.5], [isMobile ? 0.85 : 1.05, 1]);
    const heroOpacity = useTransform(heroScroll, [0, 0.3], [0.4, 1]);

    const handleSignOut = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.refresh();
    };

    const toggleFaq = (index: number) => {
        setOpenFaq(openFaq === index ? null : index);
    };

    return (
        <div className="min-h-screen bg-[#050505] text-zinc-50 font-sans selection:bg-emerald-500/30">
            {/* --- Premium Navbar --- */}
            <motion.nav
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between pointer-events-none bg-[#050505]/60 backdrop-blur-xl border-b border-white/5"
            >
                {/* Logo Area */}
                <div className="flex items-center gap-3 pointer-events-auto shrink-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 backdrop-blur-md">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                            <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
                            <polyline points="22 8.5 12 15.5 2 8.5" />
                            <line x1="12" y1="22" x2="12" y2="15.5" />
                        </svg>
                    </div>
                    <span className="text-xl font-bold tracking-tight">DevOpus</span>
                </div>

                {/* Center Navigation Links (Hidden on mobile and tablet) */}
                <div className="hidden lg:flex items-center gap-8 pointer-events-auto absolute left-1/2 -translate-x-1/2">
                    <a href="#features" className="text-sm font-medium text-zinc-400 hover:text-zinc-50 transition-colors">Features</a>
                    <a href="#how-it-works" className="text-sm font-medium text-zinc-400 hover:text-zinc-50 transition-colors">How it Works</a>
                    <Link href="/pricing" className="text-sm font-medium text-zinc-400 hover:text-zinc-50 transition-colors">Pricing</Link>
                    <Link href="/careers" className="text-sm font-medium text-zinc-400 hover:text-zinc-50 transition-colors">Careers</Link>
                </div>

                {/* Nav Actions / CTAs */}
                <div className="flex items-center gap-4 pointer-events-auto shrink-0">
                    <div className="hidden lg:flex items-center gap-4">
                        {!isLoading && user ? (
                            <>
                                <Link href="/dashboard" className="text-sm font-medium text-zinc-400 hover:text-zinc-50 transition-colors">
                                    Dashboard
                                </Link>
                                <button onClick={handleSignOut} className="text-sm font-medium text-zinc-400 hover:text-zinc-50 transition-colors">
                                    Sign Out
                                </button>
                            </>
                        ) : !isLoading ? (
                            <>
                                <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-zinc-50 transition-colors">
                                    Sign In
                                </Link>
                            </>
                        ) : null}
                    </div>
                    <Link
                        href={user ? "/dashboard" : "/login"}
                        className="hidden lg:flex px-5 py-2.5 rounded-full bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]"
                    >
                        Get Started
                    </Link>

                    {/* Hamburger Button */}
                    <button
                        className="lg:hidden w-10 h-10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
                        onClick={() => setIsMobileMenuOpen(true)}
                    >
                        <Menu size={24} />
                    </button>
                </div>
            </motion.nav>

            {/* --- Mobile Navigation Overlay --- */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 z-[100] bg-black flex flex-col"
                    >
                        {/* Minimal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 backdrop-blur-md">
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                                        <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
                                        <polyline points="22 8.5 12 15.5 2 8.5" />
                                        <line x1="12" y1="22" x2="12" y2="15.5" />
                                    </svg>
                                </div>
                                <span className="text-xl font-bold tracking-tight">DevOpus</span>
                            </div>
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-black hover:scale-105 transition-transform"
                            >
                                <X size={20} className="stroke-[3]" />
                            </button>
                        </div>

                        {/* Large Numbered Links */}
                        <div className="flex-1 flex flex-col items-center justify-center gap-8 sm:gap-10">
                            {[
                                { title: "Features", url: "#features", num: "01", type: "link" },
                                { title: "How It Works", url: "#how-it-works", num: "02", type: "link" },
                                { title: "Pricing", url: "/pricing", num: "03", type: "link" },
                                { title: "Careers", url: "/careers", num: "04", type: "link" },
                                { title: user ? "Dashboard" : "Sign In", url: user ? "/dashboard" : "/login", num: "05", type: "link" },
                                ...(user ? [{ title: "Sign Out", action: handleSignOut, num: "06", type: "button" }] : [])
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: 20, opacity: 0 }}
                                    transition={{ duration: 0.4, delay: i * 0.1 }}
                                    className="flex flex-col items-center text-center group"
                                >
                                    {item.type === "link" ? (
                                        <Link
                                            href={item.url!}
                                            onClick={() => {
                                                if (item.url!.startsWith('#')) {
                                                    setIsMobileMenuOpen(false);
                                                }
                                            }}
                                            className="text-3xl sm:text-4xl font-bold text-white tracking-tight group-hover:text-emerald-400 transition-colors"
                                        >
                                            {item.title}
                                        </Link>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                item.action!();
                                                setIsMobileMenuOpen(false);
                                            }}
                                            className="text-3xl sm:text-4xl font-bold text-white tracking-tight group-hover:text-emerald-400 transition-colors"
                                        >
                                            {item.title}
                                        </button>
                                    )}
                                    <span className="text-xs font-medium text-zinc-600 mt-1 sm:mt-2 tracking-widest">{item.num}</span>
                                </motion.div>
                            ))}
                        </div>

                        {/* Subtle Footer */}
                        <div className="pb-8 text-center text-zinc-600 text-sm tracking-wide">
                            © 2026 DevOpus Inc
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- Hero Section --- */}
            <section className="relative pt-40 pb-20 px-6 sm:px-12 max-w-7xl mx-auto flex flex-col justify-center min-h-[90vh]">
                {/* Background Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

                <div className="relative z-10 max-w-4xl">
                    <FadeUp>
                        <div className="inline-flex items-center gap-2 pl-2.5 pr-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm mb-6">
                            <div className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </div>
                            <span className="text-xs font-medium text-zinc-300 tracking-wide uppercase">Introducing DevOpus 1.0</span>
                        </div>
                    </FadeUp>

                    <FadeUp delay={0.1}>
                        <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-[100px] font-bold tracking-tighter leading-[0.95] text-transparent bg-clip-text bg-gradient-to-br from-white via-zinc-200 to-zinc-600 mb-8">
                            Build Beautiful Software. <br />
                            <span className="italic font-light text-zinc-400">the clarity.</span>
                        </h1>
                    </FadeUp>

                    <FadeUp delay={0.2}>
                        <p className="text-xl sm:text-2xl text-zinc-400 max-w-2xl leading-relaxed font-light mb-10">
                            We don't just write code; we build systems. Your personal AI engineering team, executing with perfect context!
                        </p>
                    </FadeUp>

                    <FadeUp delay={0.3} className="flex flex-wrap items-center gap-4">
                        <Link
                            href={user ? "/dashboard" : "/login"}
                            className="group flex items-center gap-2 px-8 py-4 rounded-full bg-white text-black text-lg font-medium hover:bg-zinc-200 transition-all"
                        >
                            Start Building
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <a
                            href="#how-it-works"
                            className="flex items-center gap-2 px-8 py-4 rounded-full border border-zinc-800 bg-zinc-900/30 text-zinc-300 text-lg font-medium hover:bg-zinc-800 transition-all backdrop-blur-sm"
                        >
                            See How It Works
                        </a>
                    </FadeUp>
                </div>

                {/* Hero Visual - 3D Scroll Reveal */}
                <div ref={heroRef} className="mt-20 relative w-full" style={{ perspective: '1200px' }}>
                    <motion.div
                        style={{
                            rotateX: heroRotateX,
                            scale: heroScale,
                            opacity: heroOpacity,
                        }}
                        className="relative w-full h-[400px] sm:h-[600px] rounded-2xl sm:rounded-[2.5rem] overflow-hidden border border-zinc-800/50 bg-[#0a0a0a] shadow-2xl origin-bottom"
                    >
                        {/* Mock Browser/Editor Headers */}
                        <div className="absolute top-0 left-0 right-0 h-12 border-b border-zinc-800 bg-zinc-900 flex items-center px-5 gap-2 z-20">
                            <div className="flex gap-2">
                                <div className="w-3.5 h-3.5 rounded-full bg-[#FF5F57]" />
                                <div className="w-3.5 h-3.5 rounded-full bg-[#FEBC2E]" />
                                <div className="w-3.5 h-3.5 rounded-full bg-[#28C840]" />
                            </div>
                        </div>
                        {/* Mock Sandpack representation */}
                        <AnimatedHeroCard />
                    </motion.div>
                </div>
            </section>

            {/* --- How It Works Pipeline --- */}
            <section id="how-it-works" className="py-32 px-6 sm:px-12 max-w-7xl mx-auto border-t border-zinc-900">
                <FadeUp>
                    <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">The Engine.</h2>
                    <p className="text-xl text-zinc-500 font-light max-w-2xl mb-20">A sophisticated 4-agent architecture working in perfect harmony.</p>
                </FadeUp>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
                    {/* Animated Flowing Line (Desktop) */}
                    <div className="hidden md:block absolute top-[64px] left-[12%] right-[12%] h-[2px]">
                        {/* Base line */}
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-emerald-500/25 to-emerald-500/10 rounded-full" />
                        {/* Animated flowing pulse */}
                        <div
                            className="absolute inset-y-0 w-[120px] rounded-full animate-flow-pulse"
                            style={{
                                background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.6), rgba(52,211,153,0.9), rgba(16,185,129,0.6), transparent)',
                                filter: 'blur(1px)',
                                boxShadow: '0 0 15px rgba(16,185,129,0.4), 0 0 30px rgba(16,185,129,0.2)',
                            }}
                        />
                        {/* Second pulse with offset */}
                        <div
                            className="absolute inset-y-0 w-[80px] rounded-full animate-flow-pulse-delayed"
                            style={{
                                background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.3), rgba(52,211,153,0.5), rgba(16,185,129,0.3), transparent)',
                                filter: 'blur(2px)',
                            }}
                        />
                    </div>

                    {/* Mobile vertical flow line */}
                    <div className="md:hidden absolute left-[64px] sm:left-[72px] top-0 bottom-0 w-[2px] -translate-x-1/2">
                        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 via-emerald-500/25 to-emerald-500/10" />
                        <div
                            className="absolute inset-x-0 h-[80px] animate-flow-pulse-vertical"
                            style={{
                                background: 'linear-gradient(180deg, transparent, rgba(16,185,129,0.6), rgba(52,211,153,0.9), rgba(16,185,129,0.6), transparent)',
                                filter: 'blur(1px)',
                                boxShadow: '0 0 15px rgba(16,185,129,0.4)',
                            }}
                        />
                    </div>

                    {[
                        { icon: Bot, title: "1. Planner", desc: "Deconstructs your natural language prompt into a master plan and feature roadmap." },
                        { icon: PenTool, title: "2. Architect", desc: "Designs the component hierarchy and establishes the implementation blueprint." },
                        { icon: Braces, title: "3. Coder", desc: "Writes production-ready React/Next.js code with Tailwind CSS and modern practices." },
                        { icon: Eye, title: "4. Reviewer", desc: "Validates code quality, structure, and aesthetics before delivering the final app." }
                    ].map((step, i) => (
                        <FadeUp key={i} delay={0.1 * i} className="relative z-10 flex flex-row md:flex-col items-center md:items-center text-left md:text-center gap-6 md:gap-0 pl-4 md:pl-0">
                            <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 shrink-0 rounded-2xl md:rounded-3xl bg-[#0a0a0a] border border-zinc-800 flex items-center justify-center md:mb-6 shadow-xl relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-500 z-20">
                                <div className="absolute inset-0 bg-emerald-500/0 md:group-hover:bg-emerald-500/5 transition-colors duration-500" />
                                {/* Subtle inner glow on hover */}
                                <div className="absolute inset-0 opacity-0 md:group-hover:opacity-100 transition-opacity duration-500" style={{ boxShadow: 'inset 0 0 30px rgba(16,185,129,0.1)' }} />
                                <step.icon className="w-8 h-8 md:w-8 md:h-8 text-zinc-300 md:group-hover:text-emerald-400 transition-colors duration-500 relative z-10" strokeWidth={1.5} />
                            </div>
                            <div className="flex-1 md:flex-none">
                                <h3 className="text-xl md:text-xl font-bold text-white mb-2 md:mb-2">{step.title}</h3>
                                <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">{step.desc}</p>
                            </div>
                        </FadeUp>
                    ))}
                </div>
            </section>

            {/* --- Showcase Parallax --- */}
            <section className="border-t border-zinc-900">
                <HeroParallax products={[
                    { title: "Fullstack Portfolio", link: "https://deekshithnanaveni.vercel.app/", thumbnail: "https://niisanszcyfjivrvfayx.supabase.co/storage/v1/object/public/show-case/Screenshot%202026-02-26%20213957.png" },
                    { title: "Connectify", link: "https://connectify2-web.vercel.app/", thumbnail: "https://niisanszcyfjivrvfayx.supabase.co/storage/v1/object/public/show-case/Screenshot%202026-02-26%20214037.png" },
                    { title: "SmartAgroX", link: "#", thumbnail: "https://niisanszcyfjivrvfayx.supabase.co/storage/v1/object/public/show-case/Screenshot%202026-02-26%20214239.png" },
                    { title: "studybuddy", link: "#", thumbnail: "https://niisanszcyfjivrvfayx.supabase.co/storage/v1/object/public/show-case/Screenshot%202026-02-26%20214326.png" },

                    { title: "Personal Portfolio", link: "#", thumbnail: "https://hionydjpudzafhxjvfsb.supabase.co/storage/v1/object/public/project-assets/show-case/Screenshot%202026-02-22%20012100.png" },

                    { title: "Content Creation Made Easy", link: "#", thumbnail: "https://hionydjpudzafhxjvfsb.supabase.co/storage/v1/object/public/project-assets/show-case/Screenshot%202026-02-22%20012122.png" },
                    { title: "Prototype Builder", link: "#", thumbnail: "https://hionydjpudzafhxjvfsb.supabase.co/storage/v1/object/public/project-assets/show-case/Screenshot%202026-02-22%20011327.png" },
                    { title: "Code Arena", link: "#", thumbnail: "https://hionydjpudzafhxjvfsb.supabase.co/storage/v1/object/public/project-assets/show-case/Screenshot%202026-02-22%20011252.png" },
                    { title: "100x Engineers", link: "#", thumbnail: "https://hionydjpudzafhxjvfsb.supabase.co/storage/v1/object/public/project-assets/show-case/Screenshot%202026-02-22%20021337.png" },
                    { title: "Content Creation Made Easy", link: "#", thumbnail: "https://hionydjpudzafhxjvfsb.supabase.co/storage/v1/object/public/project-assets/show-case/Screenshot%202026-02-22%20012122.png" },


                ]} />
            </section>

            {/* --- Features Bento Grid --- */}
            <section id="features" className="py-32 px-6 sm:px-12 max-w-7xl mx-auto border-t border-zinc-900">
                <FadeUp>
                    <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Unfair Advantages.</h2>
                    <p className="text-xl text-zinc-500 font-light max-w-2xl mb-20">Everything you need to go from idea to deployment in seconds.</p>
                </FadeUp>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:grid-rows-2 md:h-[600px]">
                    {/* Bento Box 1 */}
                    <FadeUp className="md:col-span-2 md:row-span-1">
                        <SpotlightCard className="rounded-3xl bg-zinc-900/40 border border-zinc-800/50 p-8 flex flex-col justify-between overflow-hidden h-full">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px]" />
                            <div className="relative z-20 mb-8 md:mb-0">
                                <Zap size={24} className="text-emerald-400 mb-4" />
                                <h3 className="text-2xl font-semibold mb-2">Instant Live Preview</h3>
                                <p className="text-zinc-400 max-w-sm">Powered by Sandpack, watch your application render beautifully in real-time as the AI writes the code.</p>
                            </div>
                            {/* Abstract visual */}
                            <div className="relative z-20 self-end w-full max-w-xs h-32 rounded-xl bg-[#0a0a0a] border border-zinc-800 shadow-2xl skew-x-[-10deg] translate-x-4 flex items-center px-4">
                                <div className="flex gap-2">
                                    <div className="w-12 h-3 rounded bg-zinc-800" />
                                    <div className="w-8 h-3 rounded bg-zinc-700" />
                                </div>
                            </div>
                        </SpotlightCard>
                    </FadeUp>

                    {/* Bento Box 2 */}
                    <FadeUp delay={0.1} className="md:col-span-1 md:row-span-2">
                        <SpotlightCard className="rounded-3xl bg-zinc-900/40 border border-zinc-800/50 p-8 flex flex-col overflow-hidden h-full">
                            <div className="relative z-20 mb-8">
                                <Sparkles size={24} className="text-amber-400 mb-4" />
                                <h3 className="text-2xl font-semibold mb-2">Multi-Model Brain</h3>
                                <p className="text-zinc-400">Leveraging the raw power of latest models for intricate reasoning, architecture, and UI generation.</p>
                            </div>
                            <div className="relative z-20 flex-1 flex flex-col gap-3 justify-end mt-8">
                                {['Reasoning', 'Architecting', 'Programming', 'Refining'].map((tag, i) => (
                                    <div key={i} className="px-4 py-3 rounded-xl bg-black/40 border border-zinc-800/50 text-sm font-medium flex items-center justify-between">
                                        <span className="text-zinc-300">{tag}</span>
                                        <CheckCircle2 size={16} className="text-zinc-600" />
                                    </div>
                                ))}
                            </div>
                        </SpotlightCard>
                    </FadeUp>

                    {/* Bento Box 3 */}
                    <FadeUp delay={0.2} className="md:col-span-1 md:row-span-1">
                        <SpotlightCard className="rounded-3xl bg-zinc-900/40 border border-zinc-800/50 p-8 overflow-hidden h-full">
                            <div className="relative z-20">
                                <Eye size={24} className="text-blue-400 mb-4" />
                                <h3 className="text-2xl font-semibold mb-2">Image to UI</h3>
                                <p className="text-zinc-400 text-sm">Upload wireframes or mockups. Our vision-enabled planner understands structure and replicates it flawlessly in code.</p>
                            </div>
                        </SpotlightCard>
                    </FadeUp>

                    {/* Bento Box 4 */}
                    <FadeUp delay={0.3} className="md:col-span-1 md:row-span-1">
                        <SpotlightCard className="rounded-3xl bg-zinc-900/40 border border-zinc-800/50 p-8 overflow-hidden h-full">
                            <div className="relative z-20">
                                <Github size={24} className="text-white mb-4" />
                                <h3 className="text-2xl font-semibold mb-2">Ship to Production</h3>
                                <p className="text-zinc-400 text-sm">One-click export directly to your GitHub repository. Fully typed, logically structured, ready to deploy.</p>
                            </div>
                        </SpotlightCard>
                    </FadeUp>
                </div>
            </section>

            {/* --- Testimonials --- */}
            <section className="py-32 px-6 sm:px-12 max-w-7xl mx-auto border-t border-zinc-900">
                <FadeUp>
                    <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-center mb-20 text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-500">Beloved by Builders.</h2>
                </FadeUp>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { name: "Alex R.", role: "Frontend Engineer", text: "The architectural decisions DevOpus makes are actually sane. It doesn't just spew out spaghetti code; it builds scalable component trees." },
                        { name: "Sarah K.", role: "Product Designer", text: "I uploaded a figma wireframe and had a working React prototype deployed to vercel in exactly 4 minutes. Felt like magic." },
                        { name: "Marcus T.", role: "Startup Founder", text: "It's replaced our entire MVP prototyping phase. The Sandpack live preview lets me iterate on ideas instantaneously." }
                    ].map((testimonial, i) => (
                        <FadeUp key={i} delay={0.1 * i}>
                            <SpotlightCard className="p-8 rounded-3xl bg-[#0a0a0a] border border-zinc-800 h-full">
                                <div className="relative z-20">
                                    <p className="text-zinc-300 mb-8 italic">&ldquo;{testimonial.text}&rdquo;</p>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-semibold text-zinc-500">
                                            {testimonial.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold">{testimonial.name}</div>
                                            <div className="text-xs text-zinc-500">{testimonial.role}</div>
                                        </div>
                                    </div>
                                </div>
                            </SpotlightCard>
                        </FadeUp>
                    ))}
                </div>
            </section>

            {/* --- FAQ --- */}
            <section className="py-32 px-6 sm:px-12 max-w-3xl mx-auto border-t border-zinc-900">
                <FadeUp>
                    <h2 className="text-3xl font-bold tracking-tight mb-12">Frequently Asked Questions</h2>
                </FadeUp>
                <div className="space-y-4">
                    {[
                        { q: "What stack does DevOpus generate?", a: "DevOpus generates modern, production-ready React applications using Next.js (App Router), Tailwind CSS for styling, and Lucide React for iconography. All code is standard, maintainable TypeScript/JavaScript." },
                        { q: "Can I host the generated code anywhere?", a: "Yes. You own the code. You can export the generated files to GitHub with a single click and deploy them on platforms like Vercel, Netlify, or your own infrastructure." },
                        { q: "How does the Image-to-UI feature work?", a: "Our vision-enabled planner analyzes uploaded mockups or wireframes to understand the structural layout, color hierarchy, and components, then orchestrates the coding agents to replicate the design with high fidelity." },
                        { q: "Is there a limit to how complex projects can be?", a: "DevOpus is optimized for frontend landing pages, dashboards, UI components, and single-page apps. For massive, heavily backend-dependent enterprise networks, it serves best as a rapid prototyping and UI generation tool." }
                    ].map((faq, i) => (
                        <FadeUp key={i} delay={0.05 * i}>
                            <div className="border-b border-zinc-800">
                                <button
                                    onClick={() => toggleFaq(i)}
                                    className="w-full flex items-center justify-between py-6 text-left focus:outline-none"
                                >
                                    <span className="text-lg font-medium">{faq.q}</span>
                                    <ChevronDown size={20} className={`text-zinc-500 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} />
                                </button>
                                <AnimatePresence>
                                    {openFaq === i && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <p className="pb-6 text-zinc-400">{faq.a}</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </FadeUp>
                    ))}
                </div>
            </section>

            {/* --- Massive Typography Footer --- */}
            <footer className="relative bg-[#050505] pt-32 pb-12 px-6 sm:px-12 overflow-hidden border-t border-zinc-900">
                <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row justify-between mb-20 gap-10">
                    <div className="max-w-xs">
                        <div className="flex items-center gap-3 mb-6">
                            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                                <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
                                <polyline points="22 8.5 12 15.5 2 8.5" />
                                <line x1="12" y1="22" x2="12" y2="15.5" />
                            </svg>
                            <span className="text-xl font-bold">DevOpus</span>
                        </div>
                        <p className="text-zinc-500 text-sm">The definitive agentic coding platform for modern frontend teams.</p>
                        <div className="flex gap-4 mt-6">
                            <svg viewBox="0 0 24 24" aria-hidden="true" className="w-[18px] h-[18px] fill-zinc-600 hover:fill-white cursor-pointer transition-colors"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.005 4.15H5.059z"></path></svg>
                            <Instagram size={18} className="text-zinc-600 hover:text-white cursor-pointer transition-colors" />
                            <Linkedin size={18} className="text-zinc-600 hover:text-white cursor-pointer transition-colors" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-10 text-sm">
                        <div className="flex flex-col gap-3">
                            <span className="font-semibold text-white mb-2">Product</span>
                            <a href="#features" className="text-zinc-500 hover:text-white transition-colors">Features</a>
                            <a href="#how-it-works" className="text-zinc-500 hover:text-white transition-colors">How it Works</a>
                            <Link href="/pricing" className="text-zinc-500 hover:text-white transition-colors">Pricing</Link>
                        </div>
                        <div className="flex flex-col gap-3">
                            <span className="font-semibold text-white mb-2">Resources</span>
                            <Link href="/careers" className="text-zinc-500 hover:text-white transition-colors">Careers</Link>
                            <a href="#" className="text-zinc-500 hover:text-white transition-colors">Blog</a>
                            <a href="#" className="text-zinc-500 hover:text-white transition-colors">Discord Community</a>
                        </div>
                    </div>
                </div>

                {/* Massive Typography - Hover Reveal Effect */}
                <div className="w-full flex justify-center overflow-hidden select-none mt-10">
                    <FooterTextReveal />
                </div>

                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-xs text-zinc-600 mt-10">
                    <p>© 2026 DevOpus Inc. All rights reserved.</p>
                    <p>Designed with precision.</p>
                </div>
            </footer>
        </div>
    );
}
