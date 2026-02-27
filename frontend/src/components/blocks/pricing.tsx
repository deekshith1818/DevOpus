"use client";

import { buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";
import Link from "next/link";
import { useState, useRef } from "react";
import confetti from "canvas-confetti";
import NumberFlow from "@number-flow/react";

interface PricingPlan {
    name: string;
    price: string;
    yearlyPrice: string;
    period: string;
    features: string[];
    description: string;
    buttonText: string;
    href: string;
    isPopular: boolean;
}

interface PricingProps {
    plans: PricingPlan[];
    title?: string;
    description?: string;
}

export function Pricing({
    plans,
    title = "Simple, Transparent Pricing",
    description = "Choose the plan that works for you\nAll plans include access to our platform, lead generation tools, and dedicated support.",
}: PricingProps) {
    const [isMonthly, setIsMonthly] = useState(true);
    const isDesktop = useMediaQuery("(min-width: 768px)");
    const switchRef = useRef<HTMLButtonElement>(null);

    const handleToggle = (checked: boolean) => {
        setIsMonthly(!checked);
        if (checked && switchRef.current) {
            const rect = switchRef.current.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;

            confetti({
                particleCount: 50,
                spread: 60,
                origin: {
                    x: x / window.innerWidth,
                    y: y / window.innerHeight,
                },
                colors: [
                    "#10b981", // emerald-500
                    "#34d399", // emerald-400
                    "#059669", // emerald-600
                    "#ffffff",
                ],
                ticks: 200,
                gravity: 1.2,
                decay: 0.94,
                startVelocity: 30,
                shapes: ["circle"],
            });
        }
    };

    return (
        <div className="container px-4 md:px-6 mx-auto py-20 relative z-20">
            <div className="text-center space-y-4 mb-12">
                <h2 className="text-4xl font-bold tracking-tight sm:text-5xl text-white">
                    {title}
                </h2>
                <p className="text-zinc-400 text-lg whitespace-pre-line max-w-2xl mx-auto">
                    {description}
                </p>
            </div>

            <div className="flex justify-center items-center mb-10 gap-3">
                <span className="font-semibold text-zinc-300">Monthly</span>
                <label className="relative inline-flex items-center cursor-pointer">
                    <Label>
                        <Switch
                            ref={switchRef as any}
                            checked={!isMonthly}
                            onCheckedChange={handleToggle}
                            className="relative"
                        />
                    </Label>
                </label>
                <span className="font-semibold text-zinc-300">
                    Annually <span className="text-emerald-400 text-sm ml-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">(Save 20%)</span>
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4 max-w-6xl mx-auto">
                {plans.map((plan, index) => (
                    <motion.div
                        key={index}
                        initial={{ y: 50, opacity: 1 }}
                        whileInView={
                            isDesktop
                                ? {
                                    y: plan.isPopular ? -20 : 0,
                                    opacity: 1,
                                    x: index === 2 ? -30 : index === 0 ? 30 : 0,
                                    scale: index === 0 || index === 2 ? 0.94 : 1.0,
                                }
                                : {}
                        }
                        viewport={{ once: true }}
                        transition={{
                            duration: 1.6,
                            type: "spring",
                            stiffness: 100,
                            damping: 30,
                            delay: 0.4,
                            opacity: { duration: 0.5 },
                        }}
                        className={cn(
                            `rounded-2xl border p-6 text-center lg:flex lg:flex-col lg:justify-center relative bg-[#0a0a0a]/80 backdrop-blur-xl`,
                            plan.isPopular ? "border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.1)]" : "border-white/10",
                            "flex flex-col",
                            !plan.isPopular && "mt-0 md:mt-5",
                            index === 0 || index === 2
                                ? "z-0 md:transform md:translate-x-0 md:translate-y-0 md:-translate-z-[50px]"
                                : "z-10 bg-[#0f0f0f]/90",
                            index === 0 && "md:origin-right",
                            index === 2 && "md:origin-left"
                        )}
                    >
                        {plan.isPopular && (
                            <div className="absolute top-0 right-0 bg-emerald-500 py-1 px-3 rounded-bl-xl rounded-tr-xl flex items-center">
                                <Star className="text-black h-4 w-4 fill-current mb-[1px]" />
                                <span className="text-black ml-1.5 font-bold text-xs uppercase tracking-wider">
                                    Most Popular
                                </span>
                            </div>
                        )}
                        <div className="flex-1 flex flex-col">
                            <p className="text-base font-bold text-zinc-300 uppercase tracking-widest mb-2">
                                {plan.name}
                            </p>
                            <div className="mt-6 flex items-center justify-center gap-x-2">
                                <span className="text-5xl font-bold tracking-tight text-white flex items-end">
                                    <span className="text-3xl text-zinc-500 mr-1 pb-1">$</span>
                                    <NumberFlow
                                        value={
                                            isMonthly ? Number(plan.price) : Number(plan.yearlyPrice)
                                        }
                                        format={{
                                            minimumFractionDigits: 0,
                                            maximumFractionDigits: 0,
                                        }}
                                        transformTiming={{
                                            duration: 500,
                                            easing: "ease-out",
                                        }}
                                        willChange
                                        className="font-variant-numeric: tabular-nums"
                                    />
                                </span>
                                {plan.period !== "Next 3 months" && (
                                    <span className="text-sm font-semibold leading-6 tracking-wide text-zinc-500 mt-4">
                                        / {plan.period}
                                    </span>
                                )}
                            </div>

                            <p className="text-xs leading-5 text-zinc-500 mt-2 mb-8">
                                {isMonthly ? "billed monthly" : "billed annually"}
                            </p>

                            <ul className="gap-4 flex flex-col text-sm md:text-base mb-8">
                                {plan.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-start gap-3 text-zinc-300">
                                        <Check className="h-5 w-5 text-emerald-500 shrink-0" strokeWidth={3} />
                                        <span className="text-left leading-tight">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <div className="mt-auto pt-8 border-t border-white/5">
                                <Link
                                    href={plan.href}
                                    className={cn(
                                        buttonVariants({
                                            variant: plan.isPopular ? "default" : "secondary",
                                        }),
                                        "w-full h-12 text-base font-bold transition-all duration-300",
                                        plan.isPopular
                                            ? "hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                                            : "hover:bg-white/10 hover:text-white border border-white/5"
                                    )}
                                >
                                    {plan.buttonText}
                                </Link>
                                <p className="mt-4 text-xs font-medium leading-5 text-zinc-500">
                                    {plan.description}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
