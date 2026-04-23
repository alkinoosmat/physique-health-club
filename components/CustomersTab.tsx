'use client'

import { useState, useMemo, useEffect } from 'react'
import { supabase, Customer, CustomerGoal, CustomerPayment, CustomerSchedule, Reservation } from '@/lib/supabase'
import { formatDate, formatTime, toLocalISODate, TIME_SLOTS, isValidPhone, normalizePhone } from '@/lib/utils'

interface CustomersTabProps {
  customers: Customer[]
  reservations: Reservation[]
  onDeleteCustomer: (id: string) => Promise<void>
  onToggleNoShow: (reservationId: string, value: boolean) => Promise<void>
  onUpdateCustomer: (id: string, fields: Partial<Customer>) => Promise<void>
  onBook: (date: string, slot: string, name: string, phone: string) => Promise<string | null>
  onRefresh: () => Promise<void>
}

const SUBSCRIPTION_OPTIONS = [
  { value: '', label: 'Χωρίς συνδρομή' },
  { value: 'monthly', label: 'Μηνιαία' },
  { value: 'quarterly', label: 'Τριμηνιαία' },
  { value: 'annual', label: 'Ετήσια' },
  { value: 'per_session', label: 'Ανά session' },
]

const SUBSCRIPTION_DURATIONS: Record<string, number> = {
  monthly: 30,
  quarterly: 90,
  annual: 365,
  per_session: 0,
}

const PAYMENT_STATUS_OPTIONS: { value: Customer['payment_status']; label: string }[] = [
  { value: 'paid', label: 'Πληρωμένο' },
  { value: 'unpaid', label: 'Απλήρωτο' },
  { value: 'overdue', label: 'Ληξιπρόθεσμο' },
]

// Derive real-time status from next_payment_date — overrides stored payment_status
// if the due date has passed and customer was marked paid.
function deriveStatus(customer: Customer, todayIso: string): Customer['payment_status'] {
  const { payment_status, next_payment_date } = customer
  if (!payment_status) return null
  // If they were paid but next payment date has passed → overdue
  if (payment_status === 'paid' && next_payment_date && next_payment_date < todayIso) return 'overdue'
  return payment_status
}

function paymentStatusStyle(status: Customer['payment_status']) {
  if (status === 'paid') return { dot: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50 border-green-200', label: 'Πληρωμένο' }
  if (status === 'overdue') return { dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50 border-red-200', label: 'Ληξιπρόθεσμο' }
  if (status === 'unpaid') return { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', label: 'Απλήρωτο' }
  return { dot: 'bg-gray-300', text: 'text-gray-400', bg: 'bg-gray-50 border-gray-200', label: '—' }
}

function calcNextPaymentDate(startDate: string, subscription: string): string {
  const days = SUBSCRIPTION_DURATIONS[subscription]
  if (!days || !startDate) return ''
  const [y, m, d] = startDate.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return toLocalISODate(date)
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

export default function CustomersTab({ customers, reservations, onDeleteCustomer, onToggleNoShow, onUpdateCustomer, onBook, onRefresh }: CustomersTabProps) {
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
            const effectiveStatus = deriveStatus(customer, todayIso)
            const ps = paymentStatusStyle(effectiveStatus)
            const isSelected = selectedId === customer.id
            const isConfirming = confirmDeleteId === customer.id
            const isDeleting = deletingId === customer.id

            return (
              <div key={customer.id} className={`rounded-2xl border transition-all overflow-hidden ${isSelected ? 'border-black' : 'border-gray-200 hover:border-gray-300'}`}>
                <button
                  onClick={() => setSelectedId(isSelected ? null : customer.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-black' : 'bg-gray-100'}`}>
                    <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-gray-600'}`}>
                      {customer.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{customer.name}</p>
                      {effectiveStatus && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ps.dot}`} />}
                      {effectiveStatus === 'overdue' && (
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

      {/* ── Right: Detail Panel ── */}
      {selectedCustomer ? (
        <div className="flex-1 min-w-0">
          <button onClick={() => setSelectedId(null)} className="lg:hidden flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-4 transition-colors">
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
            onBook={onBook}
            onRefresh={onRefresh}
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

// ─── Customer Detail ──────────────────────────────────────────────────────────

function CustomerDetail({ customer, reservations, todayIso, onToggleNoShow, onUpdateCustomer, onBook, onRefresh }: {
  customer: Customer
  reservations: Reservation[]
  todayIso: string
  onToggleNoShow: (id: string, value: boolean) => Promise<void>
  onUpdateCustomer: (id: string, fields: Partial<Customer>) => Promise<void>
  onBook: (date: string, slot: string, name: string, phone: string) => Promise<string | null>
  onRefresh: () => Promise<void>
}) {
  const future = reservations.filter(r => r.date > todayIso)
  const today = reservations.filter(r => r.date === todayIso)
  const past = reservations.filter(r => r.date < todayIso)
  const attended = reservations.filter(r => !r.no_show).length
  const noShows = reservations.filter(r => r.no_show).length
  const total = reservations.length
  const attendanceRate = total > 0 ? Math.round((attended / total) * 100) : 0

  const effectiveStatus = deriveStatus(customer, todayIso)
  const ps = paymentStatusStyle(effectiveStatus)

  const [editingInfo, setEditingInfo] = useState(false)
  const [editName, setEditName] = useState(customer.name)
  const [editPhone, setEditPhone] = useState(customer.phone !== '-' ? customer.phone : '')
  const [savingInfo, setSavingInfo] = useState(false)

  useEffect(() => {
    setEditName(customer.name)
    setEditPhone(customer.phone !== '-' ? customer.phone : '')
  }, [customer])

  const [phoneError, setPhoneError] = useState('')

  async function handleSaveInfo() {
    if (!editName.trim()) return
    if (editPhone.trim() && !isValidPhone(editPhone)) {
      setPhoneError('Πρέπει να ξεκινά με 69 και να έχει 10 ψηφία.')
      return
    }
    setPhoneError('')
    setSavingInfo(true)
    await onUpdateCustomer(customer.id, {
      name: editName.trim(),
      phone: editPhone.trim() ? normalizePhone(editPhone) : '-',
    })
    setSavingInfo(false)
    setEditingInfo(false)
  }

  // Sync overdue to DB if status changed
  useEffect(() => {
    if (effectiveStatus === 'overdue' && customer.payment_status !== 'overdue') {
      onUpdateCustomer(customer.id, { payment_status: 'overdue' })
    }
  }, [effectiveStatus, customer.payment_status, customer.id, onUpdateCustomer])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4 px-1">
        <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center flex-shrink-0">
          <span className="text-white text-lg font-black">{customer.name.charAt(0).toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-black tracking-tight">{customer.name}</h2>
          <p className="text-sm text-gray-400">{customer.phone !== '-' ? customer.phone : 'Χωρίς τηλέφωνο'}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {effectiveStatus && (
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-xl border ${ps.bg} ${ps.text}`}>{ps.label}</span>
          )}
          <button
            onClick={() => { setEditingInfo(e => !e) }}
            className="text-xs text-gray-400 hover:text-black transition-colors font-medium"
          >
            {editingInfo ? 'Άκυρο' : 'Επεξεργασία'}
          </button>
        </div>
      </div>

      {/* Inline edit form */}
      {editingInfo && (
        <div className="rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-sm font-bold">Επεξεργασία Στοιχείων</p>
          </div>
          <div className="px-4 py-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">Όνομα</label>
                <input
                  autoFocus
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors"
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveInfo() }}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">Τηλέφωνο</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={e => { setEditPhone(e.target.value); setPhoneError('') }}
                  placeholder="π.χ. 6912345678"
                  className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none transition-colors placeholder:text-gray-300 ${phoneError ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-black'}`}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveInfo() }}
                />
                {phoneError && <p className="text-[11px] text-red-500 mt-1">{phoneError}</p>}
              </div>
            </div>
            <button
              onClick={handleSaveInfo}
              disabled={savingInfo || !editName.trim()}
              className="w-full py-2 rounded-xl bg-black text-white text-sm font-medium hover:bg-white hover:text-black border border-black transition-all disabled:opacity-50"
            >
              {savingInfo ? 'Αποθήκευση…' : 'Αποθήκευση'}
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
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

      {/* Subscription */}
      <SubscriptionSection customer={customer} onUpdateCustomer={onUpdateCustomer} />

      {/* Payments */}
      <PaymentsSection customer={customer} todayIso={todayIso} onUpdateCustomer={onUpdateCustomer} />

      {/* Goals */}
      <GoalsSection customerId={customer.id} />

      {/* Weekly Schedule */}
      <WeeklyScheduleSection
        customerId={customer.id}
        customerName={customer.name}
        customerPhone={customer.phone}
        reservations={reservations}
        onBook={onBook}
        onRefresh={onRefresh}
      />

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
              {future.length > 0 && <ReservationGroup label="Μελλοντικές" dotColor="bg-black" labelColor="text-black" reservations={future} period="future" onToggleNoShow={onToggleNoShow} />}
              {today.length > 0 && <ReservationGroup label="Σήμερα" dotColor="bg-blue-500" labelColor="text-blue-500" reservations={today} period="today" onToggleNoShow={onToggleNoShow} />}
              {past.length > 0 && <ReservationGroup label="Παρελθόν" dotColor="bg-gray-300" labelColor="text-gray-400" reservations={past} period="past" onToggleNoShow={onToggleNoShow} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Subscription Section ─────────────────────────────────────────────────────

function SubscriptionSection({ customer, onUpdateCustomer }: {
  customer: Customer
  onUpdateCustomer: (id: string, fields: Partial<Customer>) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [subscription, setSubscription] = useState(customer.subscription ?? '')
  const [cost, setCost] = useState(customer.subscription_cost?.toString() ?? '')

  useEffect(() => {
    setSubscription(customer.subscription ?? '')
    setCost(customer.subscription_cost?.toString() ?? '')
  }, [customer])

  async function handleSave() {
    setSaving(true)
    await onUpdateCustomer(customer.id, {
      subscription: subscription || null,
      subscription_cost: cost ? parseFloat(cost) : null,
    })
    setSaving(false)
    setEditing(false)
  }

  const subLabel = SUBSCRIPTION_OPTIONS.find(o => o.value === (customer.subscription ?? ''))?.label ?? '—'

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <p className="text-sm font-bold">Συνδρομή</p>
        <button onClick={() => setEditing(e => !e)} className="text-xs text-gray-400 hover:text-black transition-colors font-medium">
          {editing ? 'Άκυρο' : 'Επεξεργασία'}
        </button>
      </div>
      <div className="px-4 py-3">
        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">Τύπος συνδρομής</label>
                <select
                  value={subscription}
                  onChange={e => setSubscription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black bg-white transition-colors"
                >
                  {SUBSCRIPTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">Κόστος (€)</label>
                <input
                  type="number"
                  value={cost}
                  onChange={e => setCost(e.target.value)}
                  placeholder="π.χ. 50"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors placeholder:text-gray-300"
                />
              </div>
            </div>
            {subscription && SUBSCRIPTION_DURATIONS[subscription] > 0 && (
              <p className="text-[11px] text-gray-400">
                Διάρκεια: <span className="font-semibold text-black">{SUBSCRIPTION_DURATIONS[subscription]} μέρες</span>
              </p>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2 rounded-xl bg-black text-white text-sm font-medium hover:bg-white hover:text-black border border-black transition-all disabled:opacity-50"
            >
              {saving ? 'Αποθήκευση…' : 'Αποθήκευση'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-gray-400 font-medium mb-0.5">Τύπος</p>
              <p className="text-sm font-semibold">{subLabel}</p>
              {customer.subscription && SUBSCRIPTION_DURATIONS[customer.subscription] > 0 && (
                <p className="text-[11px] text-gray-400 mt-0.5">{SUBSCRIPTION_DURATIONS[customer.subscription]} μέρες</p>
              )}
            </div>
            <div>
              <p className="text-[11px] text-gray-400 font-medium mb-0.5">Κόστος</p>
              <p className="text-sm font-semibold">{customer.subscription_cost != null ? `${customer.subscription_cost}€` : '—'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Payments Section ─────────────────────────────────────────────────────────

function PaymentsSection({ customer, todayIso, onUpdateCustomer }: {
  customer: Customer
  todayIso: string
  onUpdateCustomer: (id: string, fields: Partial<Customer>) => Promise<void>
}) {
  const [payments, setPayments] = useState<CustomerPayment[]>([])
  const [loadingPayments, setLoadingPayments] = useState(true)
  const [addingPayment, setAddingPayment] = useState(false)
  const [newAmount, setNewAmount] = useState(customer.subscription_cost?.toString() ?? '')
  const [newDate, setNewDate] = useState(toLocalISODate(new Date()))
  const [newNotes, setNewNotes] = useState('')
  const [savingPayment, setSavingPayment] = useState(false)

  // Payment status editing
  const [editingStatus, setEditingStatus] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<Customer['payment_status']>(deriveStatus(customer, toLocalISODate(new Date())))
  const [nextPaymentDate, setNextPaymentDate] = useState(customer.next_payment_date ?? '')
  const [reminder, setReminder] = useState(customer.payment_reminder ?? false)

  useEffect(() => {
    setPaymentStatus(deriveStatus(customer, toLocalISODate(new Date())))
    setNextPaymentDate(customer.next_payment_date ?? '')
    setReminder(customer.payment_reminder ?? false)
    setNewAmount(customer.subscription_cost?.toString() ?? '')
  }, [customer])

  useEffect(() => {
    setLoadingPayments(true)
    supabase
      .from('customer_payments')
      .select('*')
      .eq('customer_id', customer.id)
      .order('paid_at', { ascending: false })
      .then(({ data }) => {
        setPayments((data as CustomerPayment[]) || [])
        setLoadingPayments(false)
      })
  }, [customer.id])

  // Auto-calculate next payment date when adding
  function calcNext(fromDate: string): string {
    if (!customer.subscription) return ''
    return calcNextPaymentDate(fromDate, customer.subscription)
  }

  async function handleAddPayment() {
    if (!newAmount || !newDate) return
    setSavingPayment(true)
    const amount = parseFloat(newAmount)
    const { data } = await supabase
      .from('customer_payments')
      .insert({ customer_id: customer.id, amount, paid_at: newDate, notes: newNotes.trim() || null })
      .select()
      .single()

    if (data) {
      setPayments(prev => [data as CustomerPayment, ...prev])
      // Auto-update customer status to paid + calculate next payment
      const nextDate = calcNext(newDate)
      await onUpdateCustomer(customer.id, {
        payment_status: 'paid',
        next_payment_date: nextDate || null,
      })
    }
    setNewDate(toLocalISODate(new Date()))
    setNewNotes('')
    setAddingPayment(false)
    setSavingPayment(false)
  }

  async function handleDeletePayment(id: string) {
    await supabase.from('customer_payments').delete().eq('id', id)
    setPayments(prev => prev.filter(p => p.id !== id))
  }

  async function handleSaveStatus() {
    setSavingStatus(true)
    await onUpdateCustomer(customer.id, {
      payment_status: paymentStatus,
      next_payment_date: nextPaymentDate || null,
      payment_reminder: reminder,
    })
    setSavingStatus(false)
    setEditingStatus(false)
  }

  const effectiveStatus = deriveStatus(customer, todayIso)
  const ps = paymentStatusStyle(effectiveStatus)
  const hasAutoCalc = customer.subscription && SUBSCRIPTION_DURATIONS[customer.subscription] > 0

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <p className="text-sm font-bold">Πληρωμές</p>
        <button
          onClick={() => setAddingPayment(a => !a)}
          className="text-xs text-gray-400 hover:text-black transition-colors font-medium"
        >
          {addingPayment ? 'Άκυρο' : '+ Καταχώρηση'}
        </button>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Status bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {effectiveStatus ? (
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border ${ps.bg} ${ps.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${ps.dot}`} />
                {ps.label}
              </span>
            ) : (
              <span className="text-xs text-gray-300">Χωρίς κατάσταση</span>
            )}
            {customer.next_payment_date && (
              <span className={`text-xs ${effectiveStatus === 'overdue' ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                Επόμενη: {formatDate(customer.next_payment_date)}
              </span>
            )}
            {customer.payment_reminder && (
              <span className="text-[10px] text-amber-600 font-medium">🔔</span>
            )}
          </div>
          <button onClick={() => setEditingStatus(e => !e)} className="text-xs text-gray-400 hover:text-black transition-colors">
            {editingStatus ? 'Άκυρο' : 'Επεξεργασία'}
          </button>
        </div>

        {/* Status editing */}
        {editingStatus && (
          <div className="space-y-2 p-3 rounded-xl border border-gray-200 bg-gray-50">
            <div className="grid grid-cols-2 gap-2">
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
                <label className="block text-[11px] font-medium text-gray-400 mb-1">
                  Επόμενη πληρωμή
                  {hasAutoCalc && <span className="ml-1 text-black font-semibold">· αυτόματα</span>}
                </label>
                <input
                  type="date"
                  value={nextPaymentDate}
                  onChange={e => setNextPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={reminder} onChange={e => setReminder(e.target.checked)} className="w-4 h-4 rounded border-gray-300 accent-black" />
              <span className="text-xs text-gray-600">Υπενθύμιση πληρωμής</span>
            </label>
            <button onClick={handleSaveStatus} disabled={savingStatus} className="w-full py-2 rounded-xl bg-black text-white text-sm font-medium hover:bg-white hover:text-black border border-black transition-all disabled:opacity-50">
              {savingStatus ? 'Αποθήκευση…' : 'Αποθήκευση'}
            </button>
          </div>
        )}

        {/* Add payment form */}
        {addingPayment && (
          <div className="space-y-2 p-3 rounded-xl border border-dashed border-gray-300 bg-gray-50">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">Ποσό (€)</label>
                <input
                  autoFocus
                  type="number"
                  value={newAmount}
                  onChange={e => setNewAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors placeholder:text-gray-300"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">Ημ/νία πληρωμής</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors"
                />
              </div>
            </div>
            {hasAutoCalc && newDate && (
              <p className="text-[11px] text-gray-400">
                Επόμενη αυτόματα: <span className="font-semibold text-black">{formatDate(calcNext(newDate))}</span>
              </p>
            )}
            <input
              type="text"
              value={newNotes}
              onChange={e => setNewNotes(e.target.value)}
              placeholder="Σημειώσεις (προαιρετικό)"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors placeholder:text-gray-300"
            />
            <button
              onClick={handleAddPayment}
              disabled={savingPayment || !newAmount || !newDate}
              className="w-full py-2 rounded-xl bg-black text-white text-sm font-medium hover:bg-white hover:text-black border border-black transition-all disabled:opacity-40"
            >
              {savingPayment ? 'Καταχώρηση…' : 'Καταχώρηση Πληρωμής'}
            </button>
          </div>
        )}

        {/* Payment history */}
        {loadingPayments ? (
          <div className="h-8 rounded-xl bg-gray-100 animate-pulse" />
        ) : payments.length === 0 ? (
          <p className="text-xs text-gray-300 text-center py-3">Δεν υπάρχουν καταχωρημένες πληρωμές.</p>
        ) : (
          <div className="space-y-1.5">
            {payments.map(p => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-green-700">{p.amount}€</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {formatDate(p.paid_at)}{p.notes ? ` · ${p.notes}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => handleDeletePayment(p.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors p-1 flex-shrink-0"
                >
                  <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                    <path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M3 3.5l.5 8a.5.5 0 00.5.5h6a.5.5 0 00.5-.5l.5-8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
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
        <button onClick={() => setAdding(a => !a)} className="text-xs text-gray-400 hover:text-black transition-colors font-medium">
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

// ─── Weekly Schedule Section ──────────────────────────────────────────────────

const DAY_NAMES_SHORT = ['', 'Δευ', 'Τρί', 'Τετ', 'Πέμ', 'Παρ', 'Σαβ']
const DAY_NAMES_FULL = ['', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο']

// Returns the next upcoming YYYY-MM-DD for a given day-of-week (1=Mon…6=Sat)
function nextDateForDow(dow: number): string {
  const today = new Date()
  const todayDow = today.getDay() === 0 ? 7 : today.getDay()
  let diff = dow - todayDow
  if (diff <= 0) diff += 7
  const d = new Date(today)
  d.setDate(today.getDate() + diff)
  // toLocalISODate equivalent inline
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function WeeklyScheduleSection({ customerId, customerName, customerPhone, reservations, onBook, onRefresh }: {
  customerId: string
  customerName: string
  customerPhone: string
  reservations: Reservation[]
  onBook: (date: string, slot: string, name: string, phone: string) => Promise<string | null>
  onRefresh: () => Promise<void>
}) {
  const [schedules, setSchedules] = useState<CustomerSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null) // 'dow-slot'
  const [conflictMsg, setConflictMsg] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    supabase
      .from('customer_schedule')
      .select('*')
      .eq('customer_id', customerId)
      .then(({ data }) => {
        setSchedules((data as CustomerSchedule[]) || [])
        setLoading(false)
      })
  }, [customerId])

  function isActive(dow: number, slot: string) {
    return schedules.some(s => s.day_of_week === dow && s.slot === slot)
  }

  async function toggle(dow: number, slot: string) {
    const key = `${dow}-${slot}`
    setToggling(key)
    setConflictMsg(null)
    const existing = schedules.find(s => s.day_of_week === dow && s.slot === slot)

    if (existing) {
      // Remove from schedule only — leave existing reservations intact
      await supabase.from('customer_schedule').delete().eq('id', existing.id)
      setSchedules(prev => prev.filter(s => s.id !== existing.id))
    } else {
      // Add to schedule + immediately book the next occurrence
      const date = nextDateForDow(dow)
      const err = await onBook(date, slot, customerName, customerPhone)
      if (err) {
        // Conflict — still save the schedule entry, surface the error
        setConflictMsg(`${DAY_NAMES_FULL[dow]} ${slot}: ${err}`)
      } else {
        await onRefresh()
      }
      const { data } = await supabase
        .from('customer_schedule')
        .insert({ customer_id: customerId, day_of_week: dow, slot })
        .select()
        .single()
      if (data) setSchedules(prev => [...prev, data as CustomerSchedule])
    }
    setToggling(null)
  }

  const sessionCount = schedules.length

  const byDay = [1,2,3,4,5,6].map(dow => ({
    dow,
    slots: schedules.filter(s => s.day_of_week === dow).map(s => s.slot).sort(),
  })).filter(d => d.slots.length > 0)

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold">Εβδομαδιαίο Πρόγραμμα</p>
          {sessionCount > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black text-white">
              {sessionCount}×/εβδ.
            </span>
          )}
        </div>
      </div>

      <div className="px-4 py-3 space-y-4">
        {/* Conflict notice */}
        {conflictMsg && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 mt-0.5">
              <path d="M7 1L13 12H1L7 1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
              <path d="M7 5.5v3M7 10h.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <span className="flex-1">{conflictMsg}</span>
            <button onClick={() => setConflictMsg(null)} className="text-amber-400 hover:text-amber-700 flex-shrink-0">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        )}

        {/* Summary chips */}
        {byDay.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {byDay.map(({ dow, slots }) => (
              <div key={dow} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-gray-200 bg-gray-50">
                <span className="text-[11px] font-bold text-gray-500">{DAY_NAMES_SHORT[dow]}</span>
                <div className="flex gap-1">
                  {slots.map(s => (
                    <span key={s} className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md bg-black text-white">{s}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="h-32 rounded-xl bg-gray-100 animate-pulse" />
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-[11px]">
              <thead>
                <tr>
                  <th className="text-left px-1 py-1 font-medium text-gray-400 w-14">Ώρα</th>
                  {[1,2,3,4,5,6].map(dow => (
                    <th key={dow} className="text-center px-1 py-1 font-semibold text-gray-600 w-10">
                      {DAY_NAMES_SHORT[dow]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map(slot => (
                  <tr key={slot} className="hover:bg-gray-50 transition-colors">
                    <td className="px-1 py-0.5 font-mono text-gray-400">{slot}</td>
                    {[1,2,3,4,5,6].map(dow => {
                      const active = isActive(dow, slot)
                      const key = `${dow}-${slot}`
                      const isLoading = toggling === key
                      return (
                        <td key={dow} className="px-1 py-0.5 text-center">
                          <button
                            onClick={() => toggle(dow, slot)}
                            disabled={!!toggling}
                            title={`${DAY_NAMES_FULL[dow]} ${slot}`}
                            className={`w-7 h-7 rounded-lg border transition-all disabled:opacity-50 ${
                              active
                                ? 'bg-black border-black text-white'
                                : 'border-gray-200 hover:border-black hover:bg-gray-50'
                            }`}
                          >
                            {isLoading ? (
                              <span className="text-[8px]">…</span>
                            ) : active ? (
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="mx-auto">
                                <path d="M1.5 5l2.5 2.5L8.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            ) : null}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {sessionCount === 0 && !loading && (
          <p className="text-xs text-gray-300 text-center py-2">
            Κάνε κλικ στα κελιά για να ορίσεις το εβδομαδιαίο πρόγραμμα του {customerName}.
          </p>
        )}
      </div>
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
