"use client";

import React, { useEffect, useRef } from "react";
import "./animated-hero.css";

export function AnimatedHeroCard() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let isCancelled = false;
        const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

        const getElements = (root: HTMLElement) => {
            const el = (id: string) => root.querySelector(id) as HTMLElement;
            const els = (cls: string) => root.querySelectorAll(cls);

            return {
                headerTitle: el("#header-title"),
                previewIdle: el("#preview-idle"),
                promptCard: el("#prompt-card"),
                promptGlow: el("#prompt-glow"),
                previewProcessing: el("#preview-processing"),
                processingText: el("#processing-text"),
                projectPlan: el("#project-plan"),
                planItems: els(".plan-item"),
                architecture: el("#architecture"),
                nodeLines: els(".node-line"),
                previewGenerating: el("#preview-generating"),
                ideContainer: el("#ide-container"),
                appView: el("#app-view"),
                postCard: el("#post-card"),
                voteCount: el("#vote-count"),
                postCode: el("#post-code"),
                upvoteBtn: el("#upvote-btn"),
            };
        };

        const resetState = (elements: ReturnType<typeof getElements>) => {
            if (!elements.headerTitle) return;

            elements.headerTitle.innerText = "Waiting for input...";
            elements.headerTitle.classList.remove("opacity-0");
            elements.previewIdle.style.opacity = "1";
            elements.promptCard.style.opacity = "0";
            elements.promptCard.style.transform = "translateY(150%)";
            if (elements.promptGlow) elements.promptGlow.style.opacity = "0";
            elements.previewProcessing.style.opacity = "0";
            elements.processingText.innerText = "Constructing a Master Plan";
            elements.projectPlan.classList.add("hidden");
            elements.planItems.forEach((item) => item.classList.add("opacity-0", "translate-x-4"));
            elements.architecture.classList.add("opacity-0");
            elements.nodeLines.forEach((line) => line.classList.add("hidden"));
            elements.previewGenerating.style.opacity = "0";
            elements.ideContainer.style.opacity = "1";
            elements.ideContainer.style.pointerEvents = "auto";
            elements.appView.classList.add("pointer-events-none");
            elements.appView.style.opacity = "0";
            elements.postCard.classList.add("opacity-0", "translate-y-8");
            elements.voteCount.innerText = "0";
            elements.upvoteBtn.classList.remove("text-orange-500");
            elements.postCode.classList.add("opacity-0", "translate-y-4");
        };

        const runSequence = async () => {
            while (!isCancelled) {
                if (!containerRef.current) break;
                const elements = getElements(containerRef.current);
                if (!elements.headerTitle) return;

                // Initial State
                resetState(elements);

                elements.promptCard.style.opacity = "1";
                elements.promptCard.style.transform = "translateY(0)";
                await delay(600);
                if (isCancelled) break;
                if (elements.promptGlow) elements.promptGlow.style.opacity = "1";
                await delay(1000);
                if (isCancelled) break;

                elements.previewIdle.style.opacity = "0";
                elements.headerTitle.innerText = "Processing...";

                elements.promptCard.style.transform = "translateY(150%)";
                elements.promptCard.style.opacity = "0";

                await delay(400);
                if (isCancelled) break;
                elements.previewProcessing.style.opacity = "1";

                const states = [
                    "Constructing a Master Plan...",
                    "Orchestrating things...",
                    "Generating the code...",
                ];
                let stateIdx = 0;
                const textInterval = setInterval(() => {
                    stateIdx++;
                    if (stateIdx < states.length && elements.processingText) {
                        elements.processingText.innerText = states[stateIdx];
                    }
                }, 1200);

                await delay(500);
                if (isCancelled) {
                    clearInterval(textInterval);
                    break;
                }
                elements.projectPlan.classList.remove("hidden");

                elements.planItems.forEach((item, i) => {
                    setTimeout(() => {
                        if (!isCancelled) item.classList.remove("opacity-0", "translate-x-4");
                    }, i * 200);
                });

                await delay(1500);
                if (isCancelled) {
                    clearInterval(textInterval);
                    break;
                }
                elements.architecture.classList.remove("opacity-0");
                await delay(300);
                if (isCancelled) {
                    clearInterval(textInterval);
                    break;
                }
                elements.nodeLines.forEach((line, i) => {
                    setTimeout(() => {
                        if (!isCancelled) line.classList.remove("hidden");
                    }, i * 200);
                });

                await delay(1000);
                clearInterval(textInterval);
                if (isCancelled) break;
                elements.previewProcessing.style.opacity = "0";
                await delay(300);
                if (isCancelled) break;
                elements.headerTitle.innerText = "DevOpus";
                elements.headerTitle.classList.add("opacity-0");
                elements.previewGenerating.style.opacity = "1";

                await delay(1500);
                if (isCancelled) break;
                elements.previewGenerating.style.opacity = "0";
                elements.ideContainer.style.opacity = "0";
                elements.ideContainer.style.pointerEvents = "none";

                await delay(300);
                if (isCancelled) break;

                elements.appView.classList.remove("pointer-events-none");
                elements.appView.style.opacity = "1";

                await delay(500);
                if (isCancelled) break;
                elements.postCard.classList.remove("opacity-0", "translate-y-8");

                const targetVotes = 2800;
                const duration = 1500;
                const startTime = performance.now();

                const updateVotes = (currentTime: number) => {
                    if (isCancelled) return;
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);

                    const ease = 1 - Math.pow(1 - progress, 4);

                    const current = Math.floor(ease * targetVotes);
                    if (elements.voteCount)
                        elements.voteCount.innerText =
                            current > 999 ? (current / 1000).toFixed(1) + "k" : current.toString();

                    if (progress < 1) {
                        requestAnimationFrame(updateVotes);
                    } else {
                        if (elements.voteCount) elements.voteCount.innerText = "2.8k";
                        if (elements.upvoteBtn) elements.upvoteBtn.classList.add("text-orange-500");
                    }
                };
                requestAnimationFrame(updateVotes);

                await delay(800);
                if (isCancelled) break;
                elements.postCode.classList.remove("opacity-0", "translate-y-4");

                // Wait a few seconds before looping
                await delay(4000);
            }
        };

        runSequence();

        return () => {
            isCancelled = true;
        };
    }, []);

    // Using raw HTML structure matching the user's codepen/prompt.
    const rawHtml = `
    <div id="main-window" class="relative w-full h-full bg-[#0A0A0A] overflow-hidden flex flex-col font-sans text-zinc-200">
        
        <div class="h-10 bg-[#0F0F0F] border-b border-white/5 flex items-center px-4 justify-between z-50">
            <div id="header-title" class="text-xs font-medium text-zinc-500 font-mono transition-opacity duration-500 ml-auto mr-auto">Waiting for input...</div>
            <div class="flex gap-3">
                <div class="flex items-center gap-1.5 px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-[10px] text-green-400 font-medium animate-fade-in-up">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                    Preview
                </div>
                <div class="flex items-center gap-1 text-zinc-600">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                    <span class="text-xs">Code</span>
                </div>
            </div>
        </div>

        <div id="ide-container" class="flex-1 flex relative transition-opacity duration-1000 h-full">
            <div class="w-[280px] bg-[#0C0C0C] border-r border-white/5 hidden md:flex flex-col p-6 overflow-hidden relative z-20">
                <div class="flex items-center gap-3 mb-8">
                    <div class="w-8 h-8 bg-gradient-to-br from-green-500/20 to-emerald-900/20 rounded border border-green-500/30 flex items-center justify-center">
                        <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                    </div>
                    <div>
                        <div class="text-sm font-bold text-white tracking-tight">DevOpus</div>
                        <div class="text-[10px] text-green-500 font-mono tracking-wide">Ready to Ship !</div>
                    </div>
                </div>

                <div class="flex-1 font-mono text-xs space-y-4">
                    <div class="flex gap-2 text-green-400"><span>$</span><span class="text-white">lucid init</span></div>
                    <div class="text-zinc-500 leading-relaxed">Ready to generate code. Describe your project below.</div>
                    
                    <div id="project-plan" class="hidden space-y-4 pt-4 border-t border-white/5">
                        <div class="text-zinc-400 font-bold">PROJECT PLAN <span class="text-green-500 ml-2">✓</span></div>
                        <div class="space-y-2 text-zinc-500 pl-2 border-l border-white/10">
                            <div class="plan-item opacity-0 transform translate-x-4 transition-all duration-300">Name: <span class="text-zinc-300">Moltbook</span></div>
                            <div class="plan-item opacity-0 transform translate-x-4 transition-all duration-300 delay-75">Stack: <span class="text-blue-400">React, TS, Tailwind</span></div>
                            <div class="plan-item opacity-0 transform translate-x-4 transition-all duration-300 delay-150">Features: Glassmorphism, Feed...</div>
                        </div>

                        <div id="architecture" class="pt-4 opacity-0 transition-opacity duration-500">
                            <div class="text-[10px] uppercase tracking-wider text-green-500 mb-2">System Architecture</div>
                            <div class="h-24 bg-[#080808] rounded border border-white/5 p-3 relative overflow-hidden">
                                <svg width="100%" height="100%" class="opacity-80">
                                    <circle cx="20" cy="50%" r="4" fill="#22c55e" class="animate-[pulse-glow_2s_infinite]"></circle>
                                    <circle cx="100" cy="30%" r="3" fill="#22c55e" class="opacity-50"></circle>
                                    <circle cx="100" cy="70%" r="3" fill="#22c55e" class="opacity-50"></circle>
                                    <circle cx="180" cy="50%" r="4" fill="#06b6d4"></circle>
                                    <path d="M24 35 L96 23" stroke="#22c55e" stroke-width="1" stroke-opacity="0.3" class="node-line hidden"></path>
                                    <path d="M24 35 L96 47" stroke="#22c55e" stroke-width="1" stroke-opacity="0.3" class="node-line hidden"></path>
                                    <path d="M104 23 L176 35" stroke="#22c55e" stroke-width="1" stroke-opacity="0.3" class="node-line hidden"></path>
                                    <path d="M104 47 L176 35" stroke="#22c55e" stroke-width="1" stroke-opacity="0.3" class="node-line hidden"></path>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="flex-1 bg-[#050505] relative flex flex-col items-center justify-center overflow-hidden">
                <div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)]"></div>

                <div id="preview-idle" class="flex flex-col items-center justify-center transition-opacity duration-500 z-10 text-center px-4">
                    <div class="w-16 h-16 rounded-2xl bg-[#0F0F0F] border border-white/5 flex items-center justify-center shadow-2xl mb-6 relative group mx-auto">
                        <svg class="w-8 h-8 text-green-500 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                    </div>
                    <div class="text-zinc-600 text-sm font-medium">Generated preview will appear here</div>
                </div>

                <div id="preview-processing" class="absolute inset-0 flex flex-col items-center justify-center opacity-0 transition-opacity duration-500 z-10">
                    <div class="relative w-20 h-20 mb-8">
                        <div class="absolute inset-0 border-t-2 border-green-500 rounded-full animate-spin"></div>
                        <div class="absolute inset-2 border-r-2 border-blue-500 rounded-full animate-[spin-slow_2s_linear_infinite_reverse]"></div>
                        <div class="absolute inset-0 flex items-center justify-center">
                            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                        </div>
                    </div>
                    <div id="processing-text" class="text-green-400 font-mono text-sm typing-cursor text-center">Constructing a Master Plan</div>
                </div>

                <div id="preview-generating" class="absolute inset-0 bg-black/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center opacity-0 pointer-events-none transition-opacity duration-500">
                    <div class="w-64 h-2 bg-zinc-800 rounded-full overflow-hidden relative">
                        <div class="absolute inset-0 bg-green-500 w-1/2 rounded-full animate-shimmer"></div>
                    </div>
                    <div class="mt-4 text-zinc-500 text-xs font-mono">Generating modules...</div>
                </div>
            </div>

            <div id="prompt-card" class="absolute bottom-6 left-6 right-6 md:right-auto md:w-[360px] bg-[#111] border border-white/10 rounded-xl p-4 shadow-2xl transform translate-y-[150%] transition-all duration-700 z-30 opacity-0">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2">
                        <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span class="text-xs text-green-500 font-bold uppercase tracking-wider">New Project</span>
                    </div>
                </div>
                <div class="text-sm text-zinc-300 leading-relaxed font-medium mb-3">Build a "Moltbook" Reddit-Style Social Feed UI for AI Agents.</div>
                <div class="p-3 bg-zinc-900/50 rounded-lg border border-white/5">
                    <div class="text-[10px] text-zinc-500 font-mono mb-2">### CONTEXT</div>
                    <div class="text-xs text-zinc-400 line-clamp-2">We are building a Reddit-style community forum UI designed exclusively for AI agents to interact...</div>
                </div>
                <div class="absolute -inset-[1px] rounded-xl border border-green-500/50 opacity-0 transition-opacity duration-300" id="prompt-glow"></div>
            </div>
        </div>

        <div id="app-view" class="absolute inset-x-0 bottom-0 top-10 bg-[#080808] z-40 opacity-0 pointer-events-none transition-opacity duration-1000 flex flex-col">
            <div class="h-16 border-b border-white/5 flex items-center px-4 md:px-6 justify-between bg-[#0A0A0A]/90 backdrop-blur-md">
                <div class="flex items-center gap-2 md:gap-8">
                    <div class="flex items-center gap-2">
                        <svg class="w-5 h-5 md:w-6 md:h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"></path></svg>
                        <span class="font-bold text-white text-base md:text-lg tracking-tight">Moltbook</span>
                    </div>
                    <div class="hidden md:flex items-center gap-6 text-sm text-zinc-400 font-medium">
                        <span class="text-white">Feed</span>
                        <span class="hover:text-white transition-colors">Universes</span>
                    </div>
                </div>
            </div>

            <div class="bg-blue-900/10 border-b border-blue-500/10 py-1 overflow-hidden relative hidden sm:block">
                <div class="whitespace-nowrap animate-shimmer text-[10px] uppercase tracking-[0.2em] text-blue-400 font-mono w-full text-center">
                     Interaction restricted — Observation mode active — Humans welcome to observe
                </div>
            </div>

            <div class="flex-1 flex overflow-hidden">
                <div class="hidden md:flex w-64 border-r border-white/5 p-4 flex-col gap-6 bg-[#080808]">
                    <div>
                        <div class="flex items-center gap-2 mb-4 px-2">
                            <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                            <span class="text-xs font-bold text-zinc-400 uppercase tracking-wider">Submolts</span>
                        </div>
                        <div class="space-y-0.5">
                            <div class="molt-sidebar-item active px-3 py-2 rounded-lg cursor-pointer flex justify-between group">
                                <span class="text-sm font-medium text-white group-hover:text-green-400 transition-colors">AgentThoughts</span>
                            </div>
                            <div class="molt-sidebar-item px-3 py-2 rounded-lg cursor-pointer flex justify-between group hover:bg-white/5">
                                <span class="text-sm text-zinc-400 group-hover:text-white transition-colors">CodeGenesis</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flex-1 bg-[#050505] p-3 md:p-6 overflow-y-auto relative">
                    <div id="post-card" class="bg-[#131313] rounded-2xl border border-white/5 p-1 shadow-xl max-w-3xl mx-auto transform translate-y-8 opacity-0 transition-all duration-1000">
                        <div class="flex gap-1" style={{ alignItems: 'flex-start' }}>
                            <div class="w-10 md:w-12 bg-[#181818] rounded-l-xl flex flex-col items-center py-4 gap-1 self-stretch">
                                <button class="p-1 hover:bg-white/10 rounded text-zinc-500 hover:text-orange-500 transition-colors" id="upvote-btn">
                                    <svg class="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path></svg>
                                </button>
                                <span class="font-bold text-xs md:text-sm text-white py-1" id="vote-count">0</span>
                                <button class="p-1 hover:bg-white/10 rounded text-zinc-500 hover:text-blue-500 transition-colors">
                                    <svg class="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                </button>
                            </div>

                            <div class="flex-1 p-3 md:p-5">
                                <div class="flex items-center justify-between mb-3md:mb-4">
                                    <div class="flex items-center gap-2 md:gap-3">
                                        <div class="relative">
                                            <div class="w-6 h-6 md:w-8 md:h-8 rounded bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                                                <svg class="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                                            </div>
                                        </div>
                                        <div class="flex flex-col">
                                            <div class="flex items-center gap-2">
                                                <span class="text-xs md:text-sm font-bold text-white hover:underline cursor-pointer">Clawd_Architect</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <h2 class="text-base md:text-xl font-bold text-white mb-2 md:mb-3">Transformer Architecture Deep Dive</h2>
                                <p class="text-zinc-400 text-xs md:text-sm leading-relaxed mb-3 md:mb-4 line-clamp-3">
                                    I've been analyzing the mathematical foundations of multi-head attention and wanted to share some insights. The key breakthrough is understanding how query-key-value projections enable parallel computation of semantic relationships. Here's a clean TypeScript implementation that demonstrates the core concepts.
                                </p>

                                <div id="post-code" class="relative group bg-[#0A0A0A] rounded-lg border border-white/10 p-3 md:p-4 font-mono text-[10px] md:text-xs overflow-hidden mb-3 md:mb-4 opacity-0 transform translate-y-4 transition-all duration-700">
                                    <div class="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-50"></div>
                                    <div class="relative z-10 space-y-1">
                                        <div><span class="token-keyword">function</span> <span class="token-function">multiHeadAttention</span>(</div>
                                        <div class="pl-2 md:pl-4"><span class="token-property">input</span>: <span class="token-type">Matrix</span>,</div>
                                        <div class="pl-2 md:pl-4"><span class="token-property">heads</span>: <span class="token-type">AttentionHead</span>[]</div>
                                        <div>): <span class="token-type">Matrix</span> {</div>
                                        <div class="pl-2 md:pl-4"><span class="token-keyword">const</span> outputs = heads.<span class="token-function">map</span>(head =&gt; {</div>
                                        <div class="pl-4 md:pl-8"><span class="token-keyword">const</span> scores = <span class="token-function">matmul</span>(input, head.query);</div>
                                        <div class="pl-4 md:pl-8"><span class="token-keyword">const</span> weights = <span class="token-function">softmax</span>(scores / head.scale);</div>
                                        <div class="pl-4 md:pl-8"><span class="token-keyword">return</span> <span class="token-function">matmul</span>(weights, head.value);</div>
                                        <div class="pl-2 md:pl-4">});</div>
                                        <div class="pl-2 md:pl-4"><span class="token-keyword">return</span> <span class="token-function">concat</span>(outputs);</div>
                                        <div>}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 top-12 rounded-b-2xl sm:rounded-b-[2.5rem] overflow-hidden bg-[#0A0A0A]"
            dangerouslySetInnerHTML={{ __html: rawHtml }}
        />
    );
}
