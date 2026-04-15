'use client'

import { useState, useMemo } from 'react'
import { Customer, Reservation } from '@/lib/supabase'
import { formatDate, formatTime } from '@/lib/utils'
import { toLocalISODate } from '@/lib/utils'

interface CustomersTabProps {
  customers: Customer[]
  reservations: Reservation[]
  onDeleteCustomer: (id: string) => Promise<void>
  onToggleNoShow: (reservationId: string, value: boolean) => Promise<void>
}

export default function CustomersTab({ customers, reservations, onDeleteCustomer, onToggleNoShow }: CustomersTabProps) {
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const todayIso = toLocalISODate(new Date())

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return customers.filter(c =>
      !q || c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q)
    )
  }, [customers, search])

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
    if (expandedId === id) setExpandedId(null)
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
    <div className="space-y-4">
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
          placeholder="Αναζήτηση με όνομα ή τηλέφωνο…"
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

      {/* Count */}
      <p className="text-xs text-gray-400 font-medium px-1">
        {filtered.length} πελάτ{filtered.length === 1 ? 'ης' : 'ες'}
      </p>

      {/* List */}
      <div className="space-y-2">
        {filtered.map(customer => {
          const customerReservations = getCustomerReservations(customer.id)
          const upcoming = customerReservations.filter(r => r.date >= todayIso)
          const past = customerReservations.filter(r => r.date < todayIso)
          const noShows = customerReservations.filter(r => r.no_show).length
          const isExpanded = expandedId === customer.id
          const isConfirming = confirmDeleteId === customer.id
          const isDeleting = deletingId === customer.id

          return (
            <div key={customer.id} className="rounded-2xl border border-gray-200 overflow-hidden">
              {/* Customer row */}
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">{customer.name.charAt(0).toUpperCase()}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{customer.name}</p>
                    {noShows > 0 && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 flex-shrink-0">
                        {noShows} no-show
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-gray-400">{customer.phone !== '-' ? customer.phone : 'Χωρίς τηλέφωνο'}</p>
                    <span className="text-gray-200">·</span>
                    <p className="text-xs text-gray-400">{customerReservations.length} κρατήσεις</p>
                    {upcoming.length > 0 && (
                      <>
                        <span className="text-gray-200">·</span>
                        <p className="text-xs text-black font-medium">{upcoming.length} επερχόμενες</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {isConfirming ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs text-gray-400 hover:text-black transition-colors px-2 py-1"
                      >
                        Άκυρο
                      </button>
                      <button
                        onClick={() => handleDelete(customer.id)}
                        disabled={isDeleting}
                        className="text-xs text-red-500 hover:text-red-700 font-semibold transition-colors px-2 py-1"
                      >
                        {isDeleting ? '…' : 'Διαγραφή'}
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setConfirmDeleteId(customer.id)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors"
                        aria-label="Διαγραφή πελάτη"
                      >
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                          <path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M3 3.5l.5 8a.5.5 0 00.5.5h6a.5.5 0 00.5-.5l.5-8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : customer.id)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-black transition-all"
                        aria-label="Εμφάνιση κρατήσεων"
                      >
                        <svg
                          width="14" height="14" viewBox="0 0 14 14" fill="none"
                          className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        >
                          <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Expanded reservations */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-4">
                  {customerReservations.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-2">Καμία κράτηση συνδεδεμένη.</p>
                  ) : (
                    <>
                      {upcoming.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Επερχόμενες</p>
                          <div className="space-y-1.5">
                            {upcoming.map(r => (
                              <ReservationRow key={r.id} reservation={r} onToggleNoShow={onToggleNoShow} />
                            ))}
                          </div>
                        </div>
                      )}
                      {past.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Παρελθόν</p>
                          <div className="space-y-1.5">
                            {past.map(r => (
                              <ReservationRow key={r.id} reservation={r} onToggleNoShow={onToggleNoShow} />
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ReservationRow({ reservation, onToggleNoShow }: {
  reservation: Reservation
  onToggleNoShow: (id: string, value: boolean) => Promise<void>
}) {
  const [loading, setLoading] = useState(false)
  const isNoShow = reservation.no_show ?? false

  async function toggle() {
    setLoading(true)
    await onToggleNoShow(reservation.id, !isNoShow)
    setLoading(false)
  }

  return (
    <div className={`flex items-center justify-between rounded-xl px-3 py-2 border transition-all ${isNoShow ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
      <div className="min-w-0">
        <p className={`text-xs font-medium ${isNoShow ? 'text-amber-700 line-through' : 'text-black'}`}>
          {formatDate(reservation.date)}
        </p>
        <p className={`text-[11px] mt-0.5 ${isNoShow ? 'text-amber-400' : 'text-gray-400'}`}>
          {formatTime(reservation.start_time.slice(0, 5))} – {formatTime(reservation.end_time.slice(0, 5))}
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={loading}
        className={`flex-shrink-0 ml-3 text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all disabled:opacity-50 ${
          isNoShow
            ? 'bg-amber-100 border-amber-200 text-amber-700 hover:bg-amber-200'
            : 'bg-white border-gray-200 text-gray-400 hover:border-amber-300 hover:text-amber-600'
        }`}
      >
        {loading ? '…' : isNoShow ? 'No-show ✓' : 'No-show'}
      </button>
    </div>
  )
}
