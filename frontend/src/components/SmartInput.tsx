'use client';

import { useState, useRef, useEffect, ChangeEvent, KeyboardEvent } from 'react';
import { Plus, X, FileText, CornerRightUp, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Attachment {
    id: string;
    name: string;
    type: 'image' | 'pdf';
    data: string;
    mimeType: string;
}

export interface AttachmentPayload {
    images: Attachment[];
    pdf: Attachment | null;
}

interface SmartInputProps {
    onSend: (text: string, attachments: AttachmentPayload) => void | Promise<void>;
    isLoading?: boolean;
    placeholder?: string;
    disabled?: boolean;
    showHint?: boolean;
    className?: string;
}

export default function SmartInput({
    onSend,
    isLoading = false,
    placeholder = "Describe your project...",
    disabled = false,
    showHint = true,
    className
}: SmartInputProps) {
    const [input, setInput] = useState('');
    const [images, setImages] = useState<Attachment[]>([]);
    const [pdf, setPdf] = useState<Attachment | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);

    const imageInputRef = useRef<HTMLInputElement>(null);
    const pdfInputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = '24px'; // Reset to min height
            const scrollHeight = textarea.scrollHeight;
            textarea.style.height = Math.min(scrollHeight, 150) + 'px';
        }
    }, [input]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const generateId = () => Math.random().toString(36).substr(2, 9);

    const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) return;

            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result as string;
                setImages(prev => [...prev, {
                    id: generateId(),
                    name: file.name,
                    type: 'image',
                    data: dataUrl,
                    mimeType: file.type
                }]);
            };
            reader.readAsDataURL(file);
        });

        if (imageInputRef.current) {
            imageInputRef.current.value = '';
        }
        setShowDropdown(false);
    };

    const handlePdfSelect = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || file.type !== 'application/pdf') return;

        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            setPdf({
                id: generateId(),
                name: file.name,
                type: 'pdf',
                data: dataUrl,
                mimeType: file.type
            });
        };
        reader.readAsDataURL(file);

        if (pdfInputRef.current) {
            pdfInputRef.current.value = '';
        }
        setShowDropdown(false);
    };

    const removeImage = (id: string) => {
        setImages(prev => prev.filter(img => img.id !== id));
    };

    const removePdf = () => {
        setPdf(null);
    };

    const handleSend = async () => {
        const hasContent = input.trim() || images.length > 0 || pdf;
        if (!hasContent || isLoading || disabled) return;

        await onSend(input.trim(), { images, pdf });
        setInput('');
        setImages([]);
        setPdf(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const toggleDropdown = () => {
        if (!isLoading && !disabled) {
            setShowDropdown(!showDropdown);
        }
    };

    const hasAttachments = images.length > 0 || pdf;
    const hasContent = input.trim() || hasAttachments;

    return (
        <div className={cn("w-full py-3", className)}>
            {/* Attachments Preview */}
            {hasAttachments && (
                <div className="mb-3 px-1 space-y-2">
                    {images.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {images.map((img) => (
                                <div key={img.id} className="relative group">
                                    <div className="w-14 h-14 rounded-lg overflow-hidden border border-[#1f1f1f]">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={img.data} alt={img.name} className="w-full h-full object-cover" />
                                    </div>
                                    <button
                                        onClick={() => removeImage(img.id)}
                                        className="absolute -top-1 -right-1 p-0.5 rounded-full bg-red-500 transition-opacity opacity-0 group-hover:opacity-100"
                                    >
                                        <X size={10} className="text-white" />
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={() => imageInputRef.current?.click()}
                                className="w-14 h-14 rounded-lg flex items-center justify-center border-2 border-dashed border-[#1f1f1f] bg-[#0a0a0a] hover:border-[#22c55e]/50 transition-colors"
                            >
                                <Plus size={18} className="text-gray-500" />
                            </button>
                        </div>
                    )}

                    {pdf && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0a0a0a] border border-[#1f1f1f]">
                            <div className="w-8 h-8 rounded flex items-center justify-center bg-[#22c55e]/10">
                                <FileText size={16} className="text-[#22c55e]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{pdf.name}</p>
                                <p className="text-xs text-gray-500">PDF Document</p>
                            </div>
                            <button
                                onClick={removePdf}
                                className="p-1 rounded-full bg-[#1f1f1f] hover:bg-[#2f2f2f] transition-colors"
                            >
                                <X size={12} className="text-gray-400" />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Input Area - items-start keeps buttons at top, aligned with first line of text */}
            <div className="flex items-start gap-3 rounded-2xl border border-[#1f1f1f] bg-[#050505] px-4 py-3 focus-within:border-[#22c55e] focus-within:ring-2 focus-within:ring-[#22c55e]/20 transition-all duration-200">
                {/* Hidden file inputs */}
                <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
                <input ref={pdfInputRef} type="file" accept="application/pdf,.pdf" onChange={handlePdfSelect} className="hidden" />

                {/* Plus button - fixed at top */}
                <div className="relative flex-shrink-0 pt-0.5" ref={dropdownRef}>
                    <button
                        onClick={toggleDropdown}
                        disabled={isLoading || disabled}
                        className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200",
                            showDropdown ? "bg-[#22c55e]/20 text-[#22c55e]" : "bg-[#1f1f1f] text-gray-400 hover:text-white hover:bg-[#2f2f2f]",
                            (isLoading || disabled) && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <Plus size={16} className={cn("transition-transform duration-200", showDropdown && "rotate-45")} />
                    </button>

                    {showDropdown && (
                        <div className="absolute bottom-full left-0 mb-2 rounded-xl shadow-2xl z-50 overflow-hidden bg-[#1a1a1a] border border-white/10" style={{ minWidth: '180px' }}>
                            <button onClick={() => imageInputRef.current?.click()} className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-200 hover:bg-white/5">
                                <Paperclip size={16} className="text-gray-400" />
                                <span className="text-sm">Attach an image</span>
                            </button>
                            <button
                                onClick={() => !pdf && pdfInputRef.current?.click()}
                                disabled={!!pdf}
                                className={cn("w-full flex items-center gap-3 px-4 py-3 text-left", pdf ? "text-gray-600 cursor-not-allowed opacity-50" : "text-gray-200 hover:bg-white/5")}
                            >
                                <FileText size={16} className={pdf ? "text-gray-600" : "text-gray-400"} />
                                <span className="text-sm">Attach a PDF</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Textarea - grows with content */}
                <textarea
                    ref={textareaRef}
                    placeholder={placeholder}
                    className="flex-1 bg-transparent text-white text-sm placeholder:text-gray-500 focus:outline-none resize-none leading-6"
                    style={{ height: '24px', maxHeight: '150px' }}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading || disabled}
                    rows={1}
                />

                {/* Submit button - fixed at top */}
                <button
                    onClick={handleSend}
                    disabled={isLoading || disabled || !hasContent}
                    className={cn(
                        "flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 mt-0.5",
                        isLoading ? "bg-transparent" : hasContent ? "bg-[#22c55e] hover:bg-[#16a34a]" : "bg-[#1f1f1f]"
                    )}
                >
                    {isLoading ? (
                        <div
                            className="w-4 h-4 bg-[#22c55e] rounded-sm animate-spin"
                            style={{ animationDuration: "3s" }}
                        />
                    ) : (
                        <CornerRightUp size={14} className={cn("transition-colors", hasContent ? "text-black" : "text-gray-500")} />
                    )}
                </button>
            </div>
        </div>
    );
}
