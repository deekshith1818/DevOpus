"use client";

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

// --- Interfaces ---

export interface FolderProject {
    id: string;
    image?: string;
    title: string;
}

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600";

// --- Internal: ProjectCard (fans out on hover) ---

interface ProjectCardProps {
    image: string;
    title: string;
    delay: number;
    isVisible: boolean;
    index: number;
    totalCount: number;
}

const ProjectCard = React.forwardRef<HTMLDivElement, ProjectCardProps>(
    ({ image, title, delay, isVisible, index, totalCount }, ref) => {
        const middleIndex = (totalCount - 1) / 2;
        const factor = totalCount > 1 ? (index - middleIndex) / middleIndex : 0;

        const rotation = factor * 25;
        const translationX = factor * 85;
        const translationY = Math.abs(factor) * 12;

        return (
            <div
                ref={ref}
                className="absolute w-20 h-28 pointer-events-none"
                style={{
                    transform: isVisible
                        ? `translateY(calc(-100px + ${translationY}px)) translateX(${translationX}px) rotate(${rotation}deg) scale(1)`
                        : "translateY(0px) translateX(0px) rotate(0deg) scale(0.4)",
                    opacity: isVisible ? 1 : 0,
                    transition: `all 700ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
                    zIndex: 10 + index,
                    left: "-40px",
                    top: "-56px",
                }}
            >
                <div className={cn(
                    "w-full h-full rounded-lg overflow-hidden shadow-xl border border-white/5 relative",
                    "transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                )}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={image || PLACEHOLDER_IMAGE}
                        alt={title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                        }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    <p className="absolute bottom-1.5 left-1.5 right-1.5 text-[9px] font-black uppercase tracking-tighter text-white truncate drop-shadow-md">
                        {title}
                    </p>
                </div>
            </div>
        );
    }
);
ProjectCard.displayName = "ProjectCard";

// --- Main Export: AnimatedFolder ---

interface AnimatedFolderProps {
    title: string;
    subtitle?: string;
    projects?: FolderProject[];
    className?: string;
    gradient?: string;
    onClick?: () => void;
    children?: React.ReactNode;
}

export const AnimatedFolder: React.FC<AnimatedFolderProps> = ({
    title,
    subtitle,
    projects = [],
    className,
    gradient,
    onClick,
    children,
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const previewProjects = projects.slice(0, 5);

    const backBg = gradient || "linear-gradient(135deg, #10b981 0%, #059669 100%)";
    const tabBg = gradient || "linear-gradient(135deg, #059669 0%, #047857 100%)";
    const frontBg = gradient || "linear-gradient(135deg, #34d399 0%, #10b981 100%)";

    return (
        <div
            className={cn(
                "relative flex flex-col items-center justify-center p-6 rounded-2xl cursor-pointer",
                "bg-white/[0.03] backdrop-blur-sm border border-white/[0.06]",
                "transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
                "hover:shadow-2xl hover:border-white/[0.12] hover:bg-white/[0.05] group",
                className
            )}
            style={{
                minHeight: "280px",
                perspective: "1200px",
                transform: isHovered ? "scale(1.04) rotate(-1.5deg)" : "scale(1) rotate(0deg)",
                transition: "transform 700ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 700ms ease, border-color 300ms ease, background 300ms ease",
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onClick}
        >
            {/* Hover glow */}
            <div
                className="absolute inset-0 rounded-2xl transition-opacity duration-700 pointer-events-none"
                style={{
                    background: `radial-gradient(circle at 50% 70%, ${gradient ? '#10b981' : '#10b981'} 0%, transparent 70%)`,
                    opacity: isHovered ? 0.08 : 0,
                }}
            />

            {/* Folder visual */}
            <div className="relative flex items-center justify-center mb-2" style={{ height: "140px", width: "180px" }}>
                {/* Back panel */}
                <div
                    className="absolute w-28 h-20 rounded-lg shadow-md border border-white/10"
                    style={{
                        background: backBg,
                        transformOrigin: "bottom center",
                        transform: isHovered ? "rotateX(-20deg) scaleY(1.05)" : "rotateX(0deg) scaleY(1)",
                        transition: "transform 700ms cubic-bezier(0.16, 1, 0.3, 1)",
                        zIndex: 10,
                    }}
                />

                {/* Tab */}
                <div
                    className="absolute w-10 h-3.5 rounded-t-md border-t border-x border-white/10"
                    style={{
                        background: tabBg,
                        top: "calc(50% - 40px - 11px)",
                        left: "calc(50% - 56px + 14px)",
                        transformOrigin: "bottom center",
                        transform: isHovered ? "rotateX(-30deg) translateY(-3px)" : "rotateX(0deg) translateY(0)",
                        transition: "transform 700ms cubic-bezier(0.16, 1, 0.3, 1)",
                        zIndex: 10,
                    }}
                />

                {/* Cards fan out */}
                {previewProjects.length > 0 && (
                    <div className="absolute" style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 20 }}>
                        {previewProjects.map((project, index) => (
                            <ProjectCard
                                key={project.id}
                                image={project.image || PLACEHOLDER_IMAGE}
                                title={project.title}
                                delay={index * 50}
                                isVisible={isHovered}
                                index={index}
                                totalCount={previewProjects.length}
                            />
                        ))}
                    </div>
                )}

                {/* Front panel */}
                <div
                    className="absolute w-28 h-20 rounded-lg shadow-lg border border-white/20"
                    style={{
                        background: frontBg,
                        top: "calc(50% - 40px + 4px)",
                        transformOrigin: "bottom center",
                        transform: isHovered ? "rotateX(35deg) translateY(12px)" : "rotateX(0deg) translateY(0)",
                        transition: "transform 700ms cubic-bezier(0.16, 1, 0.3, 1)",
                        zIndex: 30,
                    }}
                />

                {/* Front panel gloss */}
                <div
                    className="absolute w-28 h-20 rounded-lg overflow-hidden pointer-events-none"
                    style={{
                        top: "calc(50% - 40px + 4px)",
                        background: "linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 60%)",
                        transformOrigin: "bottom center",
                        transform: isHovered ? "rotateX(35deg) translateY(12px)" : "rotateX(0deg) translateY(0)",
                        transition: "transform 700ms cubic-bezier(0.16, 1, 0.3, 1)",
                        zIndex: 31,
                    }}
                />
            </div>

            {/* Label area */}
            <div className="text-center mt-2">
                <h3
                    className="text-base font-bold text-white transition-all duration-500 line-clamp-2"
                    style={{
                        transform: isHovered ? "translateY(2px)" : "translateY(0)",
                    }}
                >
                    {title}
                </h3>
                {subtitle && (
                    <p className="text-xs text-zinc-500 mt-1 transition-all duration-500">
                        {subtitle}
                    </p>
                )}
                {children}
            </div>
        </div>
    );
};
