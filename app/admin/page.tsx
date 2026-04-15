'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { supabase, Reservation } from '@/lib/supabase'
import AdminCalendar from '@/components/AdminCalendar'

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'physique2024'

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (input === ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_unlocked', '1')
      onUnlock()
    } else {
      setError(true)
      setShake(true)
      setInput('')
      setTimeout(() => setShake(false), 500)
    }
  }

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-black rounded-2xl mb-4">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="4" y="9" width="12" height="9" rx="2" stroke="white" strokeWidth="1.5"/>
              <path d="M7 9V6a3 3 0 016 0v3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Πρόσβαση Διαχείρισης</h1>
          <p className="text-sm text-gray-400 mt-1">Physique Health Club</p>
        </div>

        <form onSubmit={handleSubmit} className={`space-y-3 ${shake ? 'animate-[shake_0.4s_ease]' : ''}`}>
          <input
            type="password"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(false) }}
            placeholder="Κωδικός πρόσβασης"
            autoFocus
            className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none transition-colors placeholder:text-gray-300 ${
              error ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-black'
            }`}
          />
          {error && (
            <p className="text-xs text-red-500 text-center">Λάθος κωδικός. Δοκίμασε ξανά.</p>
          )}
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-black text-white text-sm font-medium hover:bg-white hover:text-black border border-black transition-all"
          >
            Είσοδος
          </button>
        </form>
      </div>
    </main>
  )
}

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(false)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (sessionStorage.getItem('admin_unlocked') === '1') {
      setUnlocked(true)
    }
  }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error: fetchError } = await supabase
      .from('reservations')
      .select('*')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })

    if (fetchError) {
      setError('Αποτυχία φόρτωσης κρατήσεων.')
    } else {
      setReservations(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  async function handleDelete(id: string) {
    const { error: deleteError } = await supabase
      .from('reservations')
      .delete()
      .eq('id', id)

    if (!deleteError) {
      setReservations(prev => prev.filter(r => r.id !== id))
    }
  }

  const totalToday = reservations.filter(r => {
    const today = new Date()
    const y = today.getFullYear()
    const m = (today.getMonth() + 1).toString().padStart(2, '0')
    const d = today.getDate().toString().padStart(2, '0')
    return r.date === `${y}-${m}-${d}`
  }).length

  const totalUpcoming = reservations.filter(r => {
    const today = new Date()
    const y = today.getFullYear()
    const m = (today.getMonth() + 1).toString().padStart(2, '0')
    const d = today.getDate().toString().padStart(2, '0')
    return r.date >= `${y}-${m}-${d}`
  }).length

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <a
                href="/"
                className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-black hover:border-black transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  </div>
                  <span className="text-xs font-semibold tracking-[0.2em] uppercase text-gray-400">Διαχείριση</span>
                </div>
                <h1 className="text-2xl font-black tracking-tight mt-0.5">Πίνακας Διαχείρισης</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchAll}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-black hover:text-black transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 7a6 6 0 1010.9-3.4M11 1v3H8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Ανανέωση
              </button>
              <button
                onClick={() => { sessionStorage.removeItem('admin_unlocked'); setUnlocked(false) }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-red-300 hover:text-red-600 transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M9 2h3a1 1 0 011 1v8a1 1 0 01-1 1H9M6 10l4-3-4-3M1 7h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Αποσύνδεση
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <div className="px-5 py-4 rounded-xl border border-gray-200">
            <div className="text-3xl font-black">{totalToday}</div>
            <div className="text-xs text-gray-400 mt-1 font-medium uppercase tracking-wide">Κρατήσεις Σήμερα</div>
          </div>
          <div className="px-5 py-4 rounded-xl border border-gray-200">
            <div className="text-3xl font-black">{totalUpcoming}</div>
            <div className="text-xs text-gray-400 mt-1 font-medium uppercase tracking-wide">Προσεχείς</div>
          </div>
          <div className="px-5 py-4 rounded-xl border border-gray-200 col-span-2 sm:col-span-1">
            <div className="text-3xl font-black">{reservations.length}</div>
            <div className="text-xs text-gray-400 mt-1 font-medium uppercase tracking-wide">Σύνολο</div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Calendar */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 rounded-xl border border-gray-100 bg-gray-50 animate-pulse" />
            ))}
          </div>
        ) : (
          <AdminCalendar reservations={reservations} onDelete={handleDelete} />
        )}
      </div>
    </main>
  )
}
