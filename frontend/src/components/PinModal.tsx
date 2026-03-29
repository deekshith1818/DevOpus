'use client';

import { useState, useRef, useEffect } from 'react';
import { Lock, ArrowRight, X } from 'lucide-react';

interface PinModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (pin: string) => void;
}

export default function PinModal({ isOpen, onClose, onSubmit }: PinModalProps) {
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus input when modal opens
    useEffect(() => {
        if (isOpen) {
            setPin('');
            setError(false);
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin.trim().length === 0) {
            setError(true);
            return;
        }
        onSubmit(pin);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            
            {/* Modal Content */}
            <div 
                className="relative w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                style={{
                    background: 'var(--lucid-bg-secondary)',
                    border: '1px solid var(--lucid-border)'
                }}
            >
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-3 right-3 p-1.5 rounded-full text-[var(--lucid-text-muted)] hover:text-[var(--lucid-text-primary)] hover:bg-[var(--lucid-border)] transition-colors"
                >
                    <X size={16} />
                </button>

                <div className="p-6">
                    <div className="flex justify-center mb-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[var(--lucid-green)]/10 text-[var(--lucid-green)] ring-4 ring-[var(--lucid-green)]/5">
                            <Lock size={20} />
                        </div>
                    </div>
                    
                    <div className="text-center mb-6">
                        <h3 className="text-lg font-semibold text-[var(--lucid-text-primary)] mb-1">
                            Access Restricted
                        </h3>
                        <p className="text-sm text-[var(--lucid-text-muted)]">
                            This instance of DevOpus is protected to prevent unauthorized API usage. Please enter the access PIN.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <input
                                ref={inputRef}
                                type="password"
                                value={pin}
                                onChange={(e) => {
                                    setPin(e.target.value);
                                    if (error) setError(false);
                                }}
                                placeholder="Enter Access PIN"
                                className={`w-full bg-[var(--lucid-bg)] text-[var(--lucid-text-primary)] px-4 py-3 rounded-xl border focus:outline-none transition-all ${
                                    error 
                                        ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/20' 
                                        : 'border-[var(--lucid-border)] focus:border-[var(--lucid-green)] focus:ring-1 focus:ring-[var(--lucid-green)]/20'
                                }`}
                            />
                            {error && (
                                <p className="text-xs text-red-500 mt-2 text-center animate-pulse">
                                    Please enter a valid PIN
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="w-full flex items-center justify-center gap-2 bg-[var(--lucid-text-primary)] text-[var(--lucid-bg)] hover:bg-[var(--lucid-text-secondary)] font-medium px-4 py-3 rounded-xl transition-colors mt-2"
                        >
                            Unlock Access
                            <ArrowRight size={16} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
