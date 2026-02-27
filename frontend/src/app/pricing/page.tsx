import { Pricing } from "@/components/blocks/pricing";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
    title: "Pricing - DevOpus",
    description: "Transparent, flexible pricing for your AI engineering workflows.",
};

const DevOpusPlans = [
    {
        name: "Free",
        price: "0",
        yearlyPrice: "0",
        period: "Forever",
        features: [
            "Access to basic reasoning models",
            "1 concurrent agent workflow",
            "Community support",
            "Basic codebase context (up to 50 files)",
            "Standard execution speed",
        ],
        description: "Perfect for exploring the platform and trying things out.",
        buttonText: "Start Free",
        href: "/login",
        isPopular: false,
    },
    {
        name: "Independent",
        price: "29",
        yearlyPrice: "24",
        period: "per month",
        features: [
            "Access to standard reasoning models",
            "5 concurrent agent workflows",
            "Priority community support",
            "Full codebase context size",
            "Fast execution speed",
        ],
        description: "Perfect for solo developers and quick prototyping.",
        buttonText: "Get Independent Plan",
        href: "/login",
        isPopular: true,
    },
    {
        name: "Startup / Enterprise",
        price: "99",
        yearlyPrice: "79",
        period: "per month",
        features: [
            "Premium routing models (Claude 3.5 Sonnet, GPT-4o)",
            "Unlimited concurrent agent workflows",
            "Vision capabilities for UI-to-Code",
            "Private GitHub repository integration",
            "Dedicated Slack support channel",
            "White-label UI embedding",
        ],
        description: "Ideal for fast-shipping teams and scalable applications.",
        buttonText: "Contact Sales",
        href: "#",
        isPopular: false,
    },
];

export default function PricingPage() {
    return (
        <div className="min-h-screen bg-[#050505] text-zinc-50 relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-500/10 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Navbar Minimal */}
            <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between border-b border-white/5 bg-[#050505]/60 backdrop-blur-xl">
                <Link href="/" className="flex items-center gap-2 group">
                    <ArrowLeft size={16} className="text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                    <span className="text-sm font-medium text-zinc-400 group-hover:text-zinc-50 transition-colors">Return to Home</span>
                </Link>
                <div className="flex items-center gap-3 pointer-events-auto">
                    <div className="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                            <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
                            <polyline points="22 8.5 12 15.5 2 8.5" />
                            <line x1="12" y1="22" x2="12" y2="15.5" />
                        </svg>
                    </div>
                    <span className="font-bold tracking-tight hidden sm:block">DevOpus</span>
                </div>
            </nav>

            {/* Main Content */}
            <main className="pt-24 pb-12">
                <Pricing
                    plans={DevOpusPlans}
                    title="Scale Your Engineering Output"
                    description="Choose the right tier for your development team.
Upgrade, downgrade, or cancel anytime."
                />

                {/* Additional Trust Indicators */}
                <div className="max-w-4xl mx-auto mt-20 px-6 text-center border-t border-white/5 pt-12 relative z-10">
                    <h3 className="text-zinc-400 font-medium mb-6 uppercase tracking-widest text-sm">Trusted by engineering teams at</h3>
                    <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                        {/* Mock logos */}
                        <div className="text-xl font-bold tracking-tighter">Acme Corp</div>
                        <div className="text-xl font-bold italic">Globex</div>
                        <div className="text-xl font-bold uppercase tracking-widest">Soylent</div>
                        <div className="text-xl font-bold font-mono">Initech</div>
                    </div>
                </div>
            </main>
        </div>
    );
}
