'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { supabase, Reservation, Customer } from '@/lib/supabase'
import AdminCalendar from '@/components/AdminCalendar'
import CustomersTab from '@/components/CustomersTab'
import ClosedPeriodsTab from '@/components/ClosedPeriodsTab'
import { toLocalISODate } from '@/lib/utils'

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: input }),
      })
      if (res.ok) {
        sessionStorage.setItem('admin_unlocked', '1')
        onUnlock()
      } else {
        setError(true)
        setShake(true)
        setInput('')
        setTimeout(() => setShake(false), 500)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
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
            disabled={loading}
            className="w-full py-3 rounded-xl bg-black text-white text-sm font-medium hover:bg-white hover:text-black border border-black transition-all disabled:opacity-50"
          >
            {loading ? 'Έλεγχος...' : 'Είσοδος'}
          </button>
        </form>
      </div>
    </main>
  )
}

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(false)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'calendar' | 'customers' | 'closedperiods'>('calendar')

  useEffect(() => {
    if (sessionStorage.getItem('admin_unlocked') === '1') {
      setUnlocked(true)
    }
  }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError('')
    const [{ data: resData, error: resError }, { data: custData, error: custError }] = await Promise.all([
      supabase.from('reservations').select('*').order('date', { ascending: true }).order('start_time', { ascending: true }),
      supabase.from('customers').select('*').order('name', { ascending: true }),
    ])

    if (resError || custError) {
      setError('Αποτυχία φόρτωσης δεδομένων.')
    } else {
      setReservations(resData || [])
      setCustomers(custData || [])
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

  async function handleEdit(id: string, fields: { name: string; phone: string; date: string; start_time: string; end_time: string }) {
    const { error: updateError } = await supabase
      .from('reservations')
      .update(fields)
      .eq('id', id)

    if (!updateError) {
      setReservations(prev => prev.map(r => r.id === id ? { ...r, ...fields } : r))
    }
  }

  async function handleBook(date: string, slot: string, name: string, phone: string): Promise<string | null> {
    const [startHour] = slot.split(':').map(Number)
    const endHour = startHour + 1
    const endTime = `${endHour.toString().padStart(2, '0')}:00`
    const normalizedPhone = phone.trim() || '-'

    // Check for duplicate: same phone, same date, same slot
    if (normalizedPhone !== '-') {
      const isDuplicate = reservations.some(r =>
        r.date === date &&
        r.start_time.slice(0, 5) === slot &&
        r.phone === normalizedPhone
      )
      if (isDuplicate) return 'Υπάρχει ήδη κράτηση για αυτόν τον πελάτη σε αυτή την ώρα.'
    }

    // Find or create customer by phone
    let customerId: string | null = null
    if (normalizedPhone !== '-') {
      const existing = customers.find(c => c.phone === normalizedPhone)
      if (existing) {
        customerId = existing.id
      } else {
        const { data: newCustomer } = await supabase
          .from('customers')
          .insert({ name: name.trim(), phone: normalizedPhone })
          .select()
          .single()
        if (newCustomer) {
          customerId = newCustomer.id
          setCustomers(prev => [...prev, newCustomer].sort((a, b) => a.name.localeCompare(b.name)))
        }
      }
    }

    const { data, error: insertError } = await supabase
      .from('reservations')
      .insert({
        name: name.trim(),
        phone: normalizedPhone,
        date,
        start_time: slot,
        end_time: endTime,
        customer_id: customerId,
      })
      .select()
      .single()

    if (!insertError && data) {
      setReservations(prev => [...prev, data])
    }
    return null
  }

  async function handleDeleteCustomer(id: string) {
    const { error: deleteError } = await supabase.from('customers').delete().eq('id', id)
    if (!deleteError) {
      setCustomers(prev => prev.filter(c => c.id !== id))
      // unlink reservations locally
      setReservations(prev => prev.map(r => r.customer_id === id ? { ...r, customer_id: null } : r))
    }
  }

  async function handleUpdateCustomer(id: string, fields: Partial<Customer>) {
    const { error } = await supabase.from('customers').update(fields).eq('id', id)
    if (!error) {
      setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...fields } : c))
    }
  }

  async function handleToggleNoShow(reservationId: string, value: boolean) {
    const { error: updateError } = await supabase
      .from('reservations')
      .update({ no_show: value })
      .eq('id', reservationId)
    if (!updateError) {
      setReservations(prev => prev.map(r => r.id === reservationId ? { ...r, no_show: value } : r))
    }
  }

  const todayIso = toLocalISODate(new Date())
  const totalToday = reservations.filter(r => r.date === todayIso).length
  const totalUpcoming = reservations.filter(r => r.date > todayIso).length

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />

  return (
    <main className="min-h-screen bg-white overflow-x-hidden">
      {/* Header */}
      <div className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <a
                href="/"
                className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-black hover:border-black transition-all flex-shrink-0"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-black rounded-full flex items-center justify-center flex-shrink-0">
                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  </div>
                  <span className="text-xs font-semibold tracking-[0.15em] uppercase text-gray-400 truncate">Διαχείριση</span>
                </div>
                <h1 className="text-lg sm:text-2xl font-black tracking-tight mt-0.5 truncate">Πίνακας Διαχείρισης</h1>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={fetchAll}
                className="w-9 h-9 sm:w-auto sm:h-auto sm:px-4 sm:py-2.5 rounded-xl border border-gray-200 flex items-center justify-center gap-2 text-sm font-medium text-gray-600 hover:border-black hover:text-black transition-all"
                title="Ανανέωση"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 7a6 6 0 1010.9-3.4M11 1v3H8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="hidden sm:inline">Ανανέωση</span>
              </button>
              <button
                onClick={() => { sessionStorage.removeItem('admin_unlocked'); setUnlocked(false) }}
                className="w-9 h-9 sm:w-auto sm:h-auto sm:px-4 sm:py-2.5 rounded-xl border border-gray-200 flex items-center justify-center gap-2 text-sm font-medium text-gray-600 hover:border-red-300 hover:text-red-600 transition-all"
                title="Αποσύνδεση"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M9 2h3a1 1 0 011 1v8a1 1 0 01-1 1H9M6 10l4-3-4-3M1 7h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="hidden sm:inline">Αποσύνδεση</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="px-3 sm:px-5 py-3 sm:py-4 rounded-xl border border-gray-200">
            <div className="text-2xl sm:text-3xl font-black">{totalToday}</div>
            <div className="text-[10px] sm:text-xs text-gray-400 mt-1 font-medium uppercase tracking-wide leading-tight">Σήμερα</div>
          </div>
          <div className="px-3 sm:px-5 py-3 sm:py-4 rounded-xl border border-gray-200">
            <div className="text-2xl sm:text-3xl font-black">{totalUpcoming}</div>
            <div className="text-[10px] sm:text-xs text-gray-400 mt-1 font-medium uppercase tracking-wide leading-tight">Αύριο+</div>
          </div>
          <div className="px-3 sm:px-5 py-3 sm:py-4 rounded-xl border border-gray-200">
            <div className="text-2xl sm:text-3xl font-black">{reservations.length}</div>
            <div className="text-[10px] sm:text-xs text-gray-400 mt-1 font-medium uppercase tracking-wide leading-tight">Σύνολο</div>
          </div>
          <div className="px-3 sm:px-5 py-3 sm:py-4 rounded-xl border border-gray-200">
            <div className="text-2xl sm:text-3xl font-black">{customers.length}</div>
            <div className="text-[10px] sm:text-xs text-gray-400 mt-1 font-medium uppercase tracking-wide leading-tight">Πελάτες</div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-100">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
              activeTab === 'calendar' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="2" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M1 6h12M5 1v2M9 1v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Ημερολόγιο
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
              activeTab === 'customers' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="5" r="3" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M1 13a6 6 0 0112 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Πελάτες
            {customers.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                {customers.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('closedperiods')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
              activeTab === 'closedperiods' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="2" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M1 6h12M5 1v2M9 1v2M4 9.5h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Εξαιρέσεις Προγράμματος
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 rounded-xl border border-gray-100 bg-gray-50 animate-pulse" />
            ))}
          </div>
        ) : activeTab === 'calendar' ? (
          <AdminCalendar reservations={reservations} customers={customers} onDelete={handleDelete} onBook={handleBook} onEdit={handleEdit} onToggleNoShow={handleToggleNoShow} />
        ) : activeTab === 'customers' ? (
          <CustomersTab
            customers={customers}
            reservations={reservations}
            onDeleteCustomer={handleDeleteCustomer}
            onToggleNoShow={handleToggleNoShow}
            onUpdateCustomer={handleUpdateCustomer}
          />
        ) : (
          <ClosedPeriodsTab />
        )}
      </div>
    </main>
  )
}
