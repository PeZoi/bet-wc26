import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';

export const createClient = (): SupabaseClient => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Safeguard against build-time or empty env variables
  if (!url || !url.startsWith('http') || url.includes('your_supabase')) {
    interface Chainable {
      (): Chainable;
      select: () => Chainable;
      order: () => Chainable;
      eq: () => Chainable;
      not: () => Chainable;
      upsert: () => Chainable;
      update: () => Chainable;
      single: () => Chainable;
      limit: () => Chainable;
      then: (resolve: (value: { data: unknown[]; error: null }) => void) => void;
    }

    return new Proxy({} as Record<string, unknown>, {
      get(_target, prop) {
        if (prop === 'auth') {
          return {
            getUser: async () => ({ data: { user: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
            signOut: async () => ({ error: null }),
            signInWithOAuth: async () => ({ data: null, error: null }),
          };
        }

        // Return a chainable thenable object to mimic Supabase Query Builder
        const chainable = (() => chainable) as unknown as Chainable;
        chainable.select = () => chainable;
        chainable.order = () => chainable;
        chainable.eq = () => chainable;
        chainable.not = () => chainable;
        chainable.upsert = () => chainable;
        chainable.update = () => chainable;
        chainable.single = () => chainable;
        chainable.limit = () => chainable;
        chainable.then = (resolve) => resolve({ data: [], error: null });

        return chainable;
      }
    }) as unknown as SupabaseClient;
  }

  return createBrowserClient(url, anonKey || '');
};
