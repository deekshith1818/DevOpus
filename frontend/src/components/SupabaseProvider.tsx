'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/lib/supabase';
import type { SupabaseClient, Session, User } from '@supabase/supabase-js';

interface SupabaseContextType {
    supabase: SupabaseClient;
    session: Session | null;
    user: User | null;
    isLoading: boolean;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export function SupabaseProvider({ children }: { children: ReactNode }) {
    const [supabase] = useState(() => createClient());
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Only run auth on client side when env vars are configured
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (!supabaseUrl) {
            // Use a microtask to avoid synchronous setState in effect body
            queueMicrotask(() => setIsLoading(false));
            return;
        }

        // Get initial session
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) {
                // Session refresh failed (expired/invalid token) — clear stale session
                console.warn('Session expired, signing out:', error.message);
                supabase.auth.signOut().catch(() => { });
                setSession(null);
                setUser(null);
            } else {
                setSession(session);
                setUser(session?.user ?? null);
            }
            setIsLoading(false);
        }).catch((err) => {
            console.warn('Auth initialization error:', err);
            supabase.auth.signOut().catch(() => { });
            setIsLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session);
                setUser(session?.user ?? null);
                setIsLoading(false);
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, [supabase]);

    return (
        <SupabaseContext.Provider value={{ supabase, session, user, isLoading }}>
            {children}
        </SupabaseContext.Provider>
    );
}

export function useSupabase() {
    const context = useContext(SupabaseContext);
    if (context === undefined) {
        throw new Error('useSupabase must be used within a SupabaseProvider');
    }
    return context;
}
