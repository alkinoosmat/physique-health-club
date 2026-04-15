import { createClient, SupabaseClient } from '@supabase/supabase-js'

export type Reservation = {
  id: string
  name: string
  phone: string
  date: string
  start_time: string
  end_time: string
  created_at: string
  customer_id?: string | null
  no_show?: boolean
}

export type Customer = {
  id: string
  name: string
  phone: string
  created_at: string
  // Subscription
  subscription: string | null        // plan label e.g. "monthly"
  subscription_cost: number | null   // e.g. 50 (euros)
  // Payment tracking
  payment_status: 'paid' | 'unpaid' | 'overdue' | null
  next_payment_date: string | null
  payment_reminder: boolean
}

export type CustomerPayment = {
  id: string
  customer_id: string
  amount: number
  paid_at: string   // ISO date
  notes: string | null
  created_at: string
}

export type ClosedPeriod = {
  id: string
  label: string           // e.g. "Πάσχα", "Άγιος Βασίλης"
  date: string            // YYYY-MM-DD — always set
  slot: string | null     // HH:MM — null means entire day is closed
  created_at: string
}

export type CustomerGoal = {
  id: string
  customer_id: string
  title: string
  status: 'active' | 'completed'
  notes: string | null
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
