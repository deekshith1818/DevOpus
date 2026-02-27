import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        // Return a mock client during build/SSR when env vars aren't available
        // This prevents build failures while keeping runtime behavior correct
        console.warn('Supabase env vars not set, using placeholder client');
    }

    return createBrowserClient(
        supabaseUrl || 'https://placeholder.supabase.co',
        supabaseKey || 'placeholder-key'
    );
}
