import { createClient, SupabaseClient } from '@supabase/supabase-js'

export type Reservation = {
  id: string
  name: string
  phone: string
  date: string
  start_time: string
  end_time: string
  created_at: string
}

let _supabase: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
      throw new Error('Supabase environment variables are not set. Check your .env.local file.')
    }
    _supabase = createClient(url, key)
  }
  return _supabase
}

// Convenience proxy — only valid in browser/runtime (not at module init time)
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
