import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SupabaseClient } from '@supabase/supabase-js';

export const createClient = async (): Promise<SupabaseClient> => {
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

  const cookieStore = await cookies();

  return createServerClient(url, anonKey || '', {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignore warnings during prerendering
        }
      },
    },
  });
};

export const createAdminClient = (): SupabaseClient => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Safeguard against build-time or empty env variables
  if (!url || !url.startsWith('http') || url.includes('your_supabase') || !serviceKey || serviceKey.includes('here')) {
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
      get() {
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

  return createServerClient(url, serviceKey, {
    cookies: {
      getAll() { return []; },
      setAll() {}
    },
    global: {
      fetch: (url, options) => {
        return fetch(url, {
          ...options,
          cache: 'no-store',
        });
      },
    },
  });
};
