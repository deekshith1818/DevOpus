import React from 'react';
import Link from 'next/link';

const CustomHourglass = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        {/* Top Sand Pile - Half full */}
        <path d="M7.5 6.5h9L12 11z" fill="currentColor" stroke="none" fillOpacity="0.4" />

        {/* Bottom Sand Pile - Half full */}
        <path d="M8.5 16.5 12 13l3.5 3.5V21h-7z" fill="currentColor" stroke="none" fillOpacity="0.4" />

        {/* Falling Sand */}
        <line x1="12" y1="11" x2="12" y2="14" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />

        {/* Hourglass Glass Outline */}
        <path d="M5 22h14" />
        <path d="M5 2h14" />
        <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
        <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
    </svg>
);

export default function CareersPage() {
    return (
        <div className="min-h-screen bg-[#050505] text-zinc-50 font-sans selection:bg-emerald-500/30 pt-32 px-6 sm:px-12 max-w-7xl mx-auto">
            <div className="mb-12">
                <Link href="/" className="text-zinc-400 hover:text-white transition-colors inline-block mb-8">
                    &larr; Back to Home
                </Link>
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">Join <span className="text-emerald-500">DevOpus.</span></h1>
                <p className="text-xl text-zinc-400 max-w-2xl font-light">
                    Help us build the next generation of AI-powered software engineering tools. We are looking for ambitious builders who want to shape the future of development.
                </p>
            </div>

            <div className="border-t border-zinc-900 py-16 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-[20px] bg-emerald-500/10 border border-emerald-500/20 mb-6 shadow-[0_0_30px_rgba(16,185,129,0.15)] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-transparent" />
                    <CustomHourglass className="text-emerald-400 w-8 h-8 relative z-10" />
                </div>
                <h2 className="text-3xl font-semibold mb-4 text-white">We are hiring soon.</h2>
                <p className="text-zinc-400 max-w-lg mx-auto text-lg leading-relaxed">
                    We're currently heads-down building the future. New opportunities to join our core team will be posted here. Stay tuned!
                </p>

                <div className="mt-10">
                    <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-zinc-800 bg-[#0a0a0a] hover:bg-zinc-900 transition-colors text-sm font-medium text-zinc-300">
                        Explore the Product
                    </Link>
                </div>
            </div>
        </div>
    );
}
