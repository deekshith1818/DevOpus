"use client"

import { Eye, Code } from "lucide-react"
import { cn } from "@/lib/utils"

type ViewMode = 'preview' | 'code'

interface ViewToggleProps {
    mode: ViewMode
    onModeChange: (mode: ViewMode) => void
    className?: string
}

export function ViewToggle({ mode, onModeChange, className }: ViewToggleProps) {
    const isPreview = mode === 'preview'

    return (
        <div
            className={cn(
                "flex w-48 h-10 p-1 rounded-full cursor-pointer transition-all duration-300",
                "bg-zinc-950 border border-zinc-800",
                className
            )}
            role="tablist"
        >
            <div className="flex items-center w-full relative">
                {/* Sliding background pill */}
                <div
                    className="absolute left-0 h-8 w-1/2 rounded-full transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                    style={{
                        transform: isPreview ? 'translateX(0%)' : 'translateX(100%)',
                        backgroundColor: isPreview ? '#22c55e' : '#27272a',
                    }}
                />

                {/* Preview button */}
                <button
                    onClick={() => onModeChange('preview')}
                    className={cn(
                        "flex items-center justify-center gap-1.5 z-10 w-1/2 h-8 rounded-full transition-colors duration-300",
                        isPreview ? "text-black font-semibold" : "text-gray-400 hover:text-gray-300"
                    )}
                    role="tab"
                    aria-selected={isPreview}
                >
                    <Eye className="w-4 h-4" strokeWidth={2} />
                    <span className="text-[13px]">Preview</span>
                </button>

                {/* Code button */}
                <button
                    onClick={() => onModeChange('code')}
                    className={cn(
                        "flex items-center justify-center gap-1.5 z-10 w-1/2 h-8 rounded-full transition-colors duration-300",
                        !isPreview ? "text-white font-semibold" : "text-gray-500 hover:text-gray-400"
                    )}
                    role="tab"
                    aria-selected={!isPreview}
                >
                    <Code className="w-4 h-4" strokeWidth={2} />
                    <span className="text-[13px]">Code</span>
                </button>
            </div>
        </div>
    )
}

