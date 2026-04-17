import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jrovomtjqzoegpgvckah.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impyb3ZvbXRqcXpvZWdwZ3Zja2FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxOTY2MjQsImV4cCI6MjA3NTc3MjYyNH0.IKzf_2t-SD8Ckm5OQdAIJNfMYlO4J9hRFje3XdunZgE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'supabase.auth.token',
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
    },
    fetch: (url, options = {}) => {
      return fetch(url, {
        ...options,
        cache: 'no-store',
        next: { revalidate: 0 }
      })
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})
