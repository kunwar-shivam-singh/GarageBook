import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/database.types';

export const createClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Return a dummy client during build time if environment variables are not set
    return createBrowserClient<Database>(
      'https://placeholder-project.supabase.co',
      'placeholder-anon-key'
    );
  }

  return createBrowserClient<Database>(url, key);
};
