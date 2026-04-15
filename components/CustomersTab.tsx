'use client'

import { useState, useMemo, useEffect } from 'react'
import { supabase, Customer, CustomerGoal, Reservation } from '@/lib/supabase'
import { formatDate, formatTime, toLocalISODate } from '@/lib/utils'

interface CustomersTabProps {
  customers: Customer[]
  reservations: Reservation[]
  onDeleteCustomer: (id: string) => Promise<void>
  onToggleNoShow: (reservationId: string, value: boolean) => Promise<void>
  onUpdateCustomer: (id: string, fields: Partial<Customer>) => Promise<void>
}

const SUBSCRIPTION_OPTIONS = [
  { value: '', label: 'Χωρίς συνδρομή' },
  { value: 'monthly', label: 'Μηνιαία' },
  { value: 'per_session', label: 'Ανά session' },
  { value: 'quarterly', label: 'Τριμηνιαία' },
  { value: 'annual', label: 'Ετήσια' },
]

const PAYMENT_STATUS_OPTIONS: { value: Customer['payment_status']; label: string }[] = [
  { value: 'paid', label: 'Πληρωμένο' },
  { value: 'unpaid', label: 'Απλήρωτο' },
  { value: 'overdue', label: 'Ληξιπρόθεσμο' },
]

function paymentStatusStyle(status: Customer['payment_status']) {
  if (status === 'paid') return { dot: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50 border-green-200', label: 'Πληρωμένο' }
  if (status === 'overdue') return { dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50 border-red-200', label: 'Ληξιπρόθεσμο' }
  if (status === 'unpaid') return { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', label: 'Απλήρωτο' }
  return { dot: 'bg-gray-300', text: 'text-gray-400', bg: 'bg-gray-50 border-gray-200', label: '—' }
}

export default function CustomersTab({ customers, reservations, onDeleteCustomer, onToggleNoShow, onUpdateCustomer }: CustomersTabProps) {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const todayIso = toLocalISODate(new Date())

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return customers.filter(c =>
      !q || c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q)
    )
  }, [customers, search])

  const selectedCustomer = customers.find(c => c.id === selectedId) ?? null

  function getCustomerReservations(customerId: string) {
    return reservations
      .filter(r => r.customer_id === customerId)
      .sort((a, b) => b.date.localeCompare(a.date) || b.start_time.localeCompare(a.start_time))
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await onDeleteCustomer(id)
    setDeletingId(null)
    setConfirmDeleteId(null)
    if (selectedId === id) setSelectedId(null)
  }

  if (customers.length === 0) {
    return (
      <div className="py-20 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 10a4 4 0 100-8 4 4 0 000 8zM2 18a8 8 0 0116 0" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <p className="text-sm text-gray-400">Δεν υπάρχουν πελάτες ακόμα.</p>
        <p className="text-xs text-gray-300 mt-1">Θα εμφανιστούν μόλις γίνει η πρώτη κράτηση.</p>
      </div>
    )
  }

  return (
    <div className="flex gap-4 min-h-[600px]">
      {/* ── Left: Customer List ── */}
      <div className={`flex flex-col gap-3 ${selectedCustomer ? 'hidden lg:flex lg:w-72 xl:w-80 flex-shrink-0' : 'flex-1'}`}>
        {/* Search */}
        <div className="relative">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M9.5 9.5l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Αναζήτηση…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors placeholder:text-gray-300"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-black transition-colors">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        <p className="text-xs text-gray-400 font-medium px-1">{filtered.length} πελάτ{filtered.length === 1 ? 'ης' : 'ες'}</p>

        <div className="space-y-1.5">
          {filtered.map(customer => {
            const resos = getCustomerReservations(customer.id)
            const ps = paymentStatusStyle(customer.payment_status)
            const isSelected = selectedId === customer.id
            const isConfirming = confirmDeleteId === customer.id
            const isDeleting = deletingId === customer.id

            return (
              <div
                key={customer.id}
                className={`rounded-2xl border transition-all overflow-hidden ${isSelected ? 'border-black' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <button
                  onClick={() => setSelectedId(isSelected ? null : customer.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                >
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-black' : 'bg-gray-100'}`}>
                    <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-gray-600'}`}>
                      {customer.name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{customer.name}</p>
                      {customer.payment_status && (
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ps.dot}`} />
                      )}
                      {customer.payment_status === 'overdue' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 flex-shrink-0">!</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-gray-400 truncate">{customer.phone !== '-' ? customer.phone : 'Χωρίς τηλέφωνο'}</p>
                      <span className="text-gray-200 flex-shrink-0">·</span>
                      <p className="text-xs text-gray-400 flex-shrink-0">{resos.length} κρατ.</p>
                    </div>
                  </div>
                </button>

                {/* Delete actions (inline, below the button) */}
                {isSelected && (
                  <div className="px-4 pb-2 flex items-center justify-end gap-1">
                    {isConfirming ? (
                      <>
                        <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-gray-400 hover:text-black px-2 py-1 transition-colors">Άκυρο</button>
                        <button onClick={() => handleDelete(customer.id)} disabled={isDeleting} className="text-xs text-red-500 font-semibold px-2 py-1 hover:text-red-700 transition-colors">
                          {isDeleting ? '…' : 'Διαγραφή'}
                        </button>
                      </>
                    ) : (
                      <button onClick={() => setConfirmDeleteId(customer.id)} className="text-xs text-gray-300 hover:text-red-400 transition-colors flex items-center gap-1 px-1 py-1">
                        <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                          <path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M3 3.5l.5 8a.5.5 0 00.5.5h6a.5.5 0 00.5-.5l.5-8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Διαγραφή
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Right: Customer Detail Panel ── */}
      {selectedCustomer ? (
        <div className="flex-1 min-w-0">
          {/* Mobile back button */}
          <button
            onClick={() => setSelectedId(null)}
            className="lg:hidden flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-4 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L5 7l4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Πίσω στη λίστα
          </button>

          <CustomerDetail
            customer={selectedCustomer}
            reservations={getCustomerReservations(selectedCustomer.id)}
            todayIso={todayIso}
            onToggleNoShow={onToggleNoShow}
            onUpdateCustomer={onUpdateCustomer}
          />
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center text-gray-300">
          <div className="text-center">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="mx-auto mb-3 opacity-30">
              <circle cx="20" cy="14" r="8" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M4 36a16 16 0 0132 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <p className="text-sm">Επέλεξε πελάτη για λεπτομέρειες</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Customer Detail Panel ────────────────────────────────────────────────────

function CustomerDetail({ customer, reservations, todayIso, onToggleNoShow, onUpdateCustomer }: {
  customer: Customer
  reservations: Reservation[]
  todayIso: string
  onToggleNoShow: (id: string, value: boolean) => Promise<void>
  onUpdateCustomer: (id: string, fields: Partial<Customer>) => Promise<void>
}) {
  const future = reservations.filter(r => r.date > todayIso)
  const today = reservations.filter(r => r.date === todayIso)
  const past = reservations.filter(r => r.date < todayIso)
  const attended = reservations.filter(r => !r.no_show).length
  const noShows = reservations.filter(r => r.no_show).length
  const total = reservations.length
  const attendanceRate = total > 0 ? Math.round((attended / total) * 100) : 0
  const noShowRate = total > 0 ? Math.round((noShows / total) * 100) : 0

  const ps = paymentStatusStyle(customer.payment_status)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4 px-1">
        <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center flex-shrink-0">
          <span className="text-white text-lg font-black">{customer.name.charAt(0).toUpperCase()}</span>
        </div>
        <div>
          <h2 className="text-xl font-black tracking-tight">{customer.name}</h2>
          <p className="text-sm text-gray-400">{customer.phone !== '-' ? customer.phone : 'Χωρίς τηλέφωνο'}</p>
        </div>
        {customer.payment_status && (
          <span className={`ml-auto text-xs font-semibold px-3 py-1.5 rounded-xl border ${ps.bg} ${ps.text}`}>
            {ps.label}
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Σύνολο', value: total },
          { label: 'Σήμερα+', value: future.length + today.length },
          { label: 'Παρουσίες', value: `${attendanceRate}%` },
          { label: 'No-shows', value: noShows, highlight: noShows > 0 },
        ].map(stat => (
          <div key={stat.label} className={`rounded-xl border px-3 py-2.5 ${stat.highlight ? 'border-amber-200 bg-amber-50' : 'border-gray-100'}`}>
            <div className={`text-xl font-black ${stat.highlight ? 'text-amber-600' : ''}`}>{stat.value}</div>
            <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Payments */}
      <PaymentsSection customer={customer} onUpdateCustomer={onUpdateCustomer} />

      {/* Goals */}
      <GoalsSection customerId={customer.id} />

      {/* Booking History */}
      <div className="rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-sm font-bold">Ιστορικό Κρατήσεων</p>
        </div>
        <div className="px-4 py-3 space-y-4">
          {reservations.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">Καμία κράτηση συνδεδεμένη.</p>
          ) : (
            <>
              {future.length > 0 && (
                <ReservationGroup label="Μελλοντικές" dotColor="bg-black" labelColor="text-black" reservations={future} period="future" onToggleNoShow={onToggleNoShow} />
              )}
              {today.length > 0 && (
                <ReservationGroup label="Σήμερα" dotColor="bg-blue-500" labelColor="text-blue-500" reservations={today} period="today" onToggleNoShow={onToggleNoShow} />
              )}
              {past.length > 0 && (
                <ReservationGroup label="Παρελθόν" dotColor="bg-gray-300" labelColor="text-gray-400" reservations={past} period="past" onToggleNoShow={onToggleNoShow} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Payments Section ─────────────────────────────────────────────────────────

function PaymentsSection({ customer, onUpdateCustomer }: {
  customer: Customer
  onUpdateCustomer: (id: string, fields: Partial<Customer>) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [subscription, setSubscription] = useState(customer.subscription ?? '')
  const [paymentStatus, setPaymentStatus] = useState<Customer['payment_status']>(customer.payment_status)
  const [lastPayment, setLastPayment] = useState(customer.last_payment_date ?? '')
  const [nextPayment, setNextPayment] = useState(customer.next_payment_date ?? '')
  const [reminder, setReminder] = useState(customer.payment_reminder ?? false)

  // Sync if customer prop changes
  useEffect(() => {
    setSubscription(customer.subscription ?? '')
    setPaymentStatus(customer.payment_status)
    setLastPayment(customer.last_payment_date ?? '')
    setNextPayment(customer.next_payment_date ?? '')
    setReminder(customer.payment_reminder ?? false)
  }, [customer])

  async function handleSave() {
    setSaving(true)
    await onUpdateCustomer(customer.id, {
      subscription: subscription || null,
      payment_status: paymentStatus,
      last_payment_date: lastPayment || null,
      next_payment_date: nextPayment || null,
      payment_reminder: reminder,
    })
    setSaving(false)
    setEditing(false)
  }

  async function markAsPaid() {
    const today = toLocalISODate(new Date())
    setSaving(true)
    await onUpdateCustomer(customer.id, {
      payment_status: 'paid',
      last_payment_date: today,
    })
    setSaving(false)
  }

  const ps = paymentStatusStyle(customer.payment_status)
  const subLabel = SUBSCRIPTION_OPTIONS.find(o => o.value === (customer.subscription ?? ''))?.label ?? '—'

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <p className="text-sm font-bold">Πληρωμές</p>
        <button
          onClick={() => setEditing(e => !e)}
          className="text-xs text-gray-400 hover:text-black transition-colors font-medium"
        >
          {editing ? 'Άκυρο' : 'Επεξεργασία'}
        </button>
      </div>

      <div className="px-4 py-3 space-y-3">
        {editing ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">Συνδρομή</label>
                <select
                  value={subscription}
                  onChange={e => setSubscription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black bg-white transition-colors"
                >
                  {SUBSCRIPTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">Κατάσταση</label>
                <select
                  value={paymentStatus ?? ''}
                  onChange={e => setPaymentStatus(e.target.value as Customer['payment_status'])}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black bg-white transition-colors"
                >
                  <option value="">—</option>
                  {PAYMENT_STATUS_OPTIONS.map(o => <option key={o.value ?? ''} value={o.value ?? ''}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">Τελευταία πληρωμή</label>
                <input
                  type="date"
                  value={lastPayment}
                  onChange={e => setLastPayment(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">Επόμενη πληρωμή</label>
                <input
                  type="date"
                  value={nextPayment}
                  onChange={e => setNextPayment(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={reminder}
                onChange={e => setReminder(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 accent-black"
              />
              <span className="text-xs text-gray-600">Ενεργοποίηση υπενθύμισης πληρωμής</span>
            </label>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2 rounded-xl bg-black text-white text-sm font-medium hover:bg-white hover:text-black border border-black transition-all disabled:opacity-50"
            >
              {saving ? 'Αποθήκευση…' : 'Αποθήκευση'}
            </button>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] text-gray-400 font-medium mb-0.5">Συνδρομή</p>
                <p className="text-sm font-semibold">{subLabel}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 font-medium mb-0.5">Κατάσταση</p>
                {customer.payment_status ? (
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-lg border ${ps.bg} ${ps.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${ps.dot}`} />
                    {ps.label}
                  </span>
                ) : (
                  <p className="text-sm text-gray-300">—</p>
                )}
              </div>
              <div>
                <p className="text-[11px] text-gray-400 font-medium mb-0.5">Τελευταία πληρωμή</p>
                <p className="text-sm">{customer.last_payment_date ? formatDate(customer.last_payment_date) : '—'}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 font-medium mb-0.5">Επόμενη πληρωμή</p>
                <p className={`text-sm ${customer.payment_status === 'overdue' ? 'text-red-600 font-semibold' : ''}`}>
                  {customer.next_payment_date ? formatDate(customer.next_payment_date) : '—'}
                </p>
              </div>
            </div>
            {customer.payment_reminder && (
              <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                <span>🔔</span> Υπενθύμιση πληρωμής ενεργή
              </p>
            )}
            {customer.payment_status !== 'paid' && (
              <button
                onClick={markAsPaid}
                disabled={saving}
                className="w-full py-2 rounded-xl border border-green-300 text-green-700 text-sm font-semibold hover:bg-green-50 transition-all disabled:opacity-50"
              >
                {saving ? '…' : '✓ Σήμανση ως Πληρωμένο'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Goals Section ────────────────────────────────────────────────────────────

function GoalsSection({ customerId }: { customerId: string }) {
  const [goals, setGoals] = useState<CustomerGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    supabase
      .from('customer_goals')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setGoals((data as CustomerGoal[]) || [])
        setLoading(false)
      })
  }, [customerId])

  async function addGoal() {
    if (!newTitle.trim()) return
    setSaving(true)
    const { data } = await supabase
      .from('customer_goals')
      .insert({ customer_id: customerId, title: newTitle.trim(), notes: newNotes.trim() || null, status: 'active' })
      .select()
      .single()
    if (data) setGoals(prev => [...prev, data as CustomerGoal])
    setNewTitle('')
    setNewNotes('')
    setAdding(false)
    setSaving(false)
  }

  async function toggleGoal(goal: CustomerGoal) {
    const newStatus = goal.status === 'active' ? 'completed' : 'active'
    await supabase.from('customer_goals').update({ status: newStatus }).eq('id', goal.id)
    setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, status: newStatus } : g))
  }

  async function deleteGoal(id: string) {
    await supabase.from('customer_goals').delete().eq('id', id)
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  const active = goals.filter(g => g.status === 'active')
  const completed = goals.filter(g => g.status === 'completed')

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <p className="text-sm font-bold">Στόχοι</p>
        <button
          onClick={() => setAdding(a => !a)}
          className="text-xs text-gray-400 hover:text-black transition-colors font-medium"
        >
          {adding ? 'Άκυρο' : '+ Νέος στόχος'}
        </button>
      </div>

      <div className="px-4 py-3 space-y-3">
        {adding && (
          <div className="space-y-2 p-3 rounded-xl border border-dashed border-gray-300 bg-gray-50">
            <input
              autoFocus
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Τίτλος στόχου (π.χ. Χάσω 5kg)"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors placeholder:text-gray-300"
              onKeyDown={e => { if (e.key === 'Enter') addGoal() }}
            />
            <textarea
              value={newNotes}
              onChange={e => setNewNotes(e.target.value)}
              placeholder="Σημειώσεις (προαιρετικό)"
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors placeholder:text-gray-300 resize-none"
            />
            <button
              onClick={addGoal}
              disabled={saving || !newTitle.trim()}
              className="w-full py-2 rounded-xl bg-black text-white text-sm font-medium hover:bg-white hover:text-black border border-black transition-all disabled:opacity-40"
            >
              {saving ? 'Αποθήκευση…' : 'Προσθήκη'}
            </button>
          </div>
        )}

        {loading ? (
          <div className="h-8 rounded-xl bg-gray-100 animate-pulse" />
        ) : goals.length === 0 ? (
          <p className="text-xs text-gray-300 text-center py-3">Δεν υπάρχουν στόχοι ακόμα.</p>
        ) : (
          <div className="space-y-1.5">
            {active.map(goal => <GoalRow key={goal.id} goal={goal} onToggle={toggleGoal} onDelete={deleteGoal} />)}
            {completed.length > 0 && active.length > 0 && <div className="border-t border-gray-100 my-2" />}
            {completed.map(goal => <GoalRow key={goal.id} goal={goal} onToggle={toggleGoal} onDelete={deleteGoal} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function GoalRow({ goal, onToggle, onDelete }: {
  goal: CustomerGoal
  onToggle: (goal: CustomerGoal) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [deleting, setDeleting] = useState(false)
  const isCompleted = goal.status === 'completed'

  return (
    <div className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-all ${isCompleted ? 'border-gray-100 bg-gray-50' : 'border-gray-200 bg-white'}`}>
      <button onClick={() => onToggle(goal)} className="mt-0.5 flex-shrink-0">
        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isCompleted ? 'bg-black border-black' : 'border-gray-300 hover:border-black'}`}>
          {isCompleted && (
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1 4l2.5 2.5L7 1.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isCompleted ? 'line-through text-gray-400' : 'text-black'}`}>{goal.title}</p>
        {goal.notes && <p className="text-xs text-gray-400 mt-0.5">{goal.notes}</p>}
      </div>
      <button
        onClick={async () => { setDeleting(true); await onDelete(goal.id) }}
        disabled={deleting}
        className="text-gray-300 hover:text-red-400 transition-colors p-0.5 flex-shrink-0 disabled:opacity-40"
      >
        <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
          <path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M3 3.5l.5 8a.5.5 0 00.5.5h6a.5.5 0 00.5-.5l.5-8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  )
}

// ─── Reservation Group + Row ──────────────────────────────────────────────────

function ReservationGroup({ label, dotColor, labelColor, reservations, period, onToggleNoShow }: {
  label: string
  dotColor: string
  labelColor: string
  reservations: Reservation[]
  period: 'future' | 'today' | 'past'
  onToggleNoShow: (id: string, value: boolean) => Promise<void>
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
        <p className={`text-[10px] font-semibold uppercase tracking-widest ${labelColor}`}>{label}</p>
      </div>
      <div className="space-y-1.5">
        {reservations.map(r => (
          <ReservationRow key={r.id} reservation={r} period={period} onToggleNoShow={onToggleNoShow} />
        ))}
      </div>
    </div>
  )
}

function ReservationRow({ reservation, period, onToggleNoShow }: {
  reservation: Reservation
  period: 'future' | 'today' | 'past'
  onToggleNoShow: (id: string, value: boolean) => Promise<void>
}) {
  const [loading, setLoading] = useState(false)
  const isNoShow = reservation.no_show ?? false

  async function toggle() {
    setLoading(true)
    await onToggleNoShow(reservation.id, !isNoShow)
    setLoading(false)
  }

  const borderColor = isNoShow ? 'border-amber-200' : period === 'today' ? 'border-blue-200' : period === 'past' ? 'border-gray-100' : 'border-gray-200'
  const bgColor = isNoShow ? 'bg-amber-50' : period === 'today' ? 'bg-blue-50' : 'bg-white'
  const dateColor = isNoShow ? 'text-amber-700 line-through' : period === 'today' ? 'text-blue-700 font-semibold' : period === 'past' ? 'text-gray-400' : 'text-black'
  const timeColor = isNoShow ? 'text-amber-400' : period === 'today' ? 'text-blue-400' : 'text-gray-400'

  return (
    <div className={`flex items-center justify-between rounded-xl px-3 py-2 border transition-all ${bgColor} ${borderColor}`}>
      <div className="min-w-0">
        <p className={`text-xs ${dateColor}`}>{formatDate(reservation.date)}</p>
        <p className={`text-[11px] mt-0.5 ${timeColor}`}>
          {formatTime(reservation.start_time.slice(0, 5))} – {formatTime(reservation.end_time.slice(0, 5))}
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={loading}
        className={`flex-shrink-0 ml-3 text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all disabled:opacity-50 ${
          isNoShow ? 'bg-amber-100 border-amber-200 text-amber-700 hover:bg-amber-200' : 'bg-white border-gray-200 text-gray-400 hover:border-amber-300 hover:text-amber-600'
        }`}
      >
        {loading ? '…' : isNoShow ? 'No-show ✓' : 'No-show'}
      </button>
    </div>
  )
}
