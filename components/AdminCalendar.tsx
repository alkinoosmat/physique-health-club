'use client'

import { useState } from 'react'
import { Reservation } from '@/lib/supabase'
import { TIME_SLOTS, formatTime, toLocalISODate, formatDate } from '@/lib/utils'

const MAX_PER_SLOT = 7

interface AdminCalendarProps {
  reservations: Reservation[]
  onDelete: (id: string) => void
  onBook: (date: string, slot: string, name: string, phone: string) => Promise<void>
  onEdit: (id: string, fields: { name: string; phone: string; date: string; start_time: string; end_time: string }) => Promise<void>
}

export default function AdminCalendar({ reservations, onDelete, onBook, onEdit }: AdminCalendarProps) {
  const today = new Date()
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')
  const [currentDate, setCurrentDate] = useState(today)
  const [editingId, setEditingId] = useState<string | null>(null)

  function getWeekStart(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
    return d
  }

  function getWeekDays(start: Date): Date[] {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }

  const weekStart = getWeekStart(currentDate)
  const weekDays = getWeekDays(weekStart)

  function prevPeriod() {
    const d = new Date(currentDate)
    if (viewMode === 'day') d.setDate(d.getDate() - 1)
    else d.setDate(d.getDate() - 7)
    setCurrentDate(d)
  }

  function nextPeriod() {
    const d = new Date(currentDate)
    if (viewMode === 'day') d.setDate(d.getDate() + 1)
    else d.setDate(d.getDate() + 7)
    setCurrentDate(d)
  }

  function getReservationsForDate(dateIso: string): Reservation[] {
    return reservations
      .filter(r => r.date === dateIso)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
  }

  const currentIso = toLocalISODate(currentDate)
  const todayIso = toLocalISODate(today)

  const periodLabel = viewMode === 'day'
    ? currentDate.toLocaleDateString('el-GR', { weekday: 'long', month: 'long', day: 'numeric' })
    : `${weekStart.toLocaleDateString('el-GR', { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString('el-GR', { month: 'short', day: 'numeric', year: 'numeric' })}`

  const editingReservation = editingId ? reservations.find(r => r.id === editingId) ?? null : null

  return (
    <div className="space-y-4">
      {/* Edit Modal */}
      {editingReservation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={() => setEditingId(null)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold">Επεξεργασία κράτησης</h2>
              <button
                onClick={() => setEditingId(null)}
                className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-black hover:border-black transition-all"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <AdminEditForm
              reservation={editingReservation}
              onConfirm={async (fields) => {
                await onEdit(editingReservation.id, fields)
                setEditingId(null)
              }}
              onCancel={() => setEditingId(null)}
            />
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="space-y-2">
        {/* Row 1: view toggle + today */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setViewMode('day')}
              className={`px-4 py-2 text-sm font-medium transition-all ${viewMode === 'day' ? 'bg-black text-white' : 'bg-white text-gray-600 hover:text-black'}`}
            >
              Ημέρα
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 text-sm font-medium transition-all ${viewMode === 'week' ? 'bg-black text-white' : 'bg-white text-gray-600 hover:text-black'}`}
            >
              Εβδομάδα
            </button>
          </div>
          <button
            onClick={() => { setCurrentDate(new Date()); setViewMode('day') }}
            className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:border-black hover:text-black transition-all"
          >
            Σήμερα
          </button>
        </div>

        {/* Row 2: prev / label / next */}
        <div className="flex items-center gap-2">
          <button
            onClick={prevPeriod}
            className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:border-black transition-all flex-shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <div className="flex-1 text-center min-w-0">
            <p className="text-sm font-semibold truncate capitalize">{periodLabel}</p>
            {viewMode === 'day' && currentIso === todayIso && (
              <p className="text-xs text-gray-400">Σήμερα</p>
            )}
          </div>

          <button
            onClick={nextPeriod}
            className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:border-black transition-all flex-shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Day View */}
      {viewMode === 'day' && (
        <DayView
          dateIso={currentIso}
          reservations={getReservationsForDate(currentIso)}
          onDelete={onDelete}
          onBook={(slot, name, phone) => onBook(currentIso, slot, name, phone)}
          onEdit={onEdit}
          editingId={editingId}
          onEditingIdChange={setEditingId}
        />
      )}

      {/* Week View */}
      {viewMode === 'week' && (
        <WeekView
          weekDays={weekDays}
          todayIso={todayIso}
          getReservationsForDate={getReservationsForDate}
          onDelete={onDelete}
          onSelectDay={(d) => { setCurrentDate(d); setViewMode('day') }}
          onEditingIdChange={setEditingId}
        />
      )}
    </div>
  )
}

// ─── Day View ────────────────────────────────────────────────────────────────

function DayView({ dateIso, reservations, onDelete, onBook, onEdit, editingId, onEditingIdChange }: {
  dateIso: string
  reservations: Reservation[]
  onDelete: (id: string) => void
  onBook: (slot: string, name: string, phone: string) => Promise<void>
  onEdit: (id: string, fields: { name: string; phone: string; date: string; start_time: string; end_time: string }) => Promise<void>
  editingId: string | null
  onEditingIdChange: (id: string | null) => void
}) {
  const [bookingSlot, setBookingSlot] = useState<string | null>(null)

  const bySlot = new Map<string, Reservation[]>()
  for (const r of reservations) {
    const slot = r.start_time.slice(0, 5)
    if (!bySlot.has(slot)) bySlot.set(slot, [])
    bySlot.get(slot)!.push(r)
  }

  const totalBookings = reservations.length

  return (
    <div>
      {/* Day summary */}
      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
          {totalBookings === 0 ? 'Καμία κράτηση' : `${totalBookings} κράτηση${totalBookings !== 1 ? 'εις' : ''}`}
        </p>
        <p className="text-xs text-gray-400">{formatDate(dateIso)}</p>
      </div>

      <div className="space-y-2">
        {TIME_SLOTS.map((slot) => {
          const slotReservations = bySlot.get(slot) || []
          const count = slotReservations.length
          const isFull = count >= MAX_PER_SLOT
          const isBooking = bookingSlot === slot

          return (
            <div key={slot} className="flex gap-3 items-start">
              {/* Time label */}
              <div className="w-12 flex-shrink-0 text-xs font-medium text-gray-400 pt-3.5 text-right tabular-nums">
                {formatTime(slot)}
              </div>

              {/* Slot content */}
              <div className="flex-1 min-w-0">
                {isBooking ? (
                  <AdminBookingForm
                    slot={slot}
                    onConfirm={async (name, phone) => {
                      await onBook(slot, name, phone)
                      setBookingSlot(null)
                    }}
                    onCancel={() => setBookingSlot(null)}
                  />
                ) : (
                  <div className="space-y-1.5">
                    {slotReservations.map(r => (
                      <DayReservationCard
                        key={r.id}
                        reservation={r}
                        onDelete={onDelete}
                        onStartEdit={() => onEditingIdChange(r.id)}
                      />
                    ))}

                    {/* Add button */}
                    {!isFull && (
                      <button
                        onClick={() => setBookingSlot(slot)}
                        className="w-full h-10 rounded-xl border border-dashed border-gray-200 flex items-center gap-2 px-3 text-xs text-gray-300 hover:border-black hover:text-black transition-all group"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0">
                          <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        {count === 0 ? 'Προσθήκη κράτησης' : 'Άλλη κράτηση'}
                      </button>
                    )}

                    {/* Capacity bar — shown when there are bookings */}
                    {count > 0 && (
                      <div className="flex items-center gap-2 px-1">
                        <div className="flex-1 h-0.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isFull ? 'bg-black' : count >= 5 ? 'bg-amber-400' : 'bg-gray-300'}`}
                            style={{ width: `${(count / MAX_PER_SLOT) * 100}%` }}
                          />
                        </div>
                        <span className={`text-xs tabular-nums flex-shrink-0 ${isFull ? 'text-black font-semibold' : 'text-gray-400'}`}>
                          {count}/{MAX_PER_SLOT}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AdminBookingForm({ slot, onConfirm, onCancel }: {
  slot: string
  onConfirm: (name: string, phone: string) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Συμπλήρωσε όνομα.'); return }
    setLoading(true)
    setError('')
    try {
      await onConfirm(name.trim(), phone.trim() || '-')
    } catch {
      setError('Σφάλμα. Δοκίμασε ξανά.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-black bg-white p-3 space-y-2 animate-scale-in">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-1.5 h-1.5 rounded-full bg-black flex-shrink-0" />
        <span className="text-xs font-semibold">{formatTime(slot)}</span>
        <span className="text-xs text-gray-400">— Νέα κράτηση</span>
      </div>
      <div className="flex gap-2">
        <input
          autoFocus
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setError('') }}
          placeholder="Όνομα πελάτη"
          className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors placeholder:text-gray-300"
          required
        />
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="Τηλέφωνο"
          className="w-28 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors placeholder:text-gray-300"
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-500 hover:border-gray-400 hover:text-black transition-all"
        >
          Άκυρο
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-black text-white text-xs font-medium hover:bg-white hover:text-black border border-black transition-all disabled:opacity-50"
        >
          {loading ? 'Αποθήκευση...' : 'Αποθήκευση'}
        </button>
      </div>
    </form>
  )
}

function DayReservationCard({ reservation, onDelete, onStartEdit }: {
  reservation: Reservation
  onDelete: (id: string) => void
  onStartEdit: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (confirming) {
    return (
      <div className="rounded-xl border border-red-500 bg-black text-white flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
          <span className="text-sm font-medium truncate">{reservation.name}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          <button onClick={() => setConfirming(false)} className="text-xs text-gray-400 hover:text-white transition-colors px-1">
            Άκυρο
          </button>
          <button
            onClick={() => { setDeleting(true); onDelete(reservation.id) }}
            disabled={deleting}
            className="text-xs text-red-400 hover:text-red-300 font-semibold transition-colors px-1"
          >
            {deleting ? '…' : 'Διαγραφή'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative rounded-xl border border-gray-900 bg-black text-white group">
      <button
        onClick={onStartEdit}
        className="w-full text-left px-3 py-2.5 flex items-center gap-2.5 min-w-0"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
        <span className="text-sm font-medium truncate">{reservation.name}</span>
        <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:block">{reservation.phone !== '-' ? reservation.phone : ''}</span>
      </button>
      <button
        onClick={() => setConfirming(true)}
        className="absolute top-1/2 -translate-y-1/2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-400 p-1"
        aria-label="Delete booking"
      >
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M5.5 6v4M8.5 6v4M3 3.5l.5 8a.5.5 0 00.5.5h6a.5.5 0 00.5-.5l.5-8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  )
}

function AdminEditForm({ reservation, onConfirm, onCancel }: {
  reservation: Reservation
  onConfirm: (fields: { name: string; phone: string; date: string; start_time: string; end_time: string }) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(reservation.name)
  const [phone, setPhone] = useState(reservation.phone === '-' ? '' : reservation.phone)
  const [date, setDate] = useState(reservation.date)
  const [slot, setSlot] = useState(reservation.start_time.slice(0, 5))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Build date options: today + 59 more days
  const dateOptions: { iso: string; label: string }[] = []
  const today = new Date()
  for (let i = 0; i < 60; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const iso = toLocalISODate(d)
    dateOptions.push({
      iso,
      label: d.toLocaleDateString('el-GR', { weekday: 'short', month: 'short', day: 'numeric' }),
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Συμπλήρωσε όνομα.'); return }
    setLoading(true)
    setError('')
    const [startHour] = slot.split(':').map(Number)
    const endTime = `${(startHour + 1).toString().padStart(2, '0')}:00`
    try {
      await onConfirm({
        name: name.trim(),
        phone: phone.trim() || '-',
        date,
        start_time: slot,
        end_time: endTime,
      })
    } catch {
      setError('Σφάλμα. Δοκίμασε ξανά.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-black bg-white p-3 space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-1.5 h-1.5 rounded-full bg-black flex-shrink-0" />
        <span className="text-xs font-semibold">Επεξεργασία κράτησης</span>
      </div>

      {/* Name + Phone */}
      <div className="flex gap-2">
        <input
          autoFocus
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setError('') }}
          placeholder="Όνομα πελάτη"
          className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors placeholder:text-gray-300"
          required
        />
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="Τηλέφωνο"
          className="w-28 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors placeholder:text-gray-300"
        />
      </div>

      {/* Date + Time */}
      <div className="flex gap-2">
        <select
          value={date}
          onChange={e => setDate(e.target.value)}
          className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors bg-white"
        >
          {dateOptions.map(o => (
            <option key={o.iso} value={o.iso}>{o.label}</option>
          ))}
        </select>
        <select
          value={slot}
          onChange={e => setSlot(e.target.value)}
          className="w-28 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors bg-white"
        >
          {TIME_SLOTS.map(s => (
            <option key={s} value={s}>{formatTime(s)}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-500 hover:border-gray-400 hover:text-black transition-all"
        >
          Άκυρο
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-black text-white text-xs font-medium hover:bg-white hover:text-black border border-black transition-all disabled:opacity-50"
        >
          {loading ? 'Αποθήκευση...' : 'Αποθήκευση'}
        </button>
      </div>
    </form>
  )
}

// ─── Week View ───────────────────────────────────────────────────────────────

function WeekView({ weekDays, todayIso, getReservationsForDate, onDelete, onSelectDay, onEditingIdChange }: {
  weekDays: Date[]
  todayIso: string
  getReservationsForDate: (iso: string) => Reservation[]
  onDelete: (id: string) => void
  onSelectDay: (d: Date) => void
  onEditingIdChange: (id: string | null) => void
}) {
  // Only show slots that have at least one booking across the week, for a cleaner view
  const weekIsos = weekDays.map(d => toLocalISODate(d))
  const allReservations = weekIsos.flatMap(iso => getReservationsForDate(iso))
  const occupiedSlots = new Set(allReservations.map(r => r.start_time.slice(0, 5)))
  const visibleSlots = TIME_SLOTS.filter(s => occupiedSlots.has(s))

  return (
    <div>
      {/* Mobile: vertical list of days */}
      <div className="sm:hidden space-y-3">
        {weekDays.map((day) => {
          const iso = toLocalISODate(day)
          const dayReservations = getReservationsForDate(iso)
          const isToday = iso === todayIso
          const totalBookings = dayReservations.length

          return (
            <div key={iso} className="rounded-2xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => onSelectDay(day)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-all ${isToday ? 'bg-black text-white' : 'bg-gray-50 hover:bg-gray-100'}`}
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className={`text-sm font-bold capitalize ${isToday ? 'text-white' : 'text-black'}`}>
                      {day.toLocaleDateString('el-GR', { weekday: 'long' })}
                    </p>
                    <p className={`text-xs ${isToday ? 'text-gray-300' : 'text-gray-400'}`}>
                      {day.toLocaleDateString('el-GR', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  {isToday && <span className="text-xs bg-white text-black font-semibold px-2 py-0.5 rounded-full">Σήμερα</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${isToday ? 'text-gray-300' : 'text-gray-400'}`}>
                    {totalBookings === 0 ? 'Καμία' : `${totalBookings} κρατήσεις`}
                  </span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={isToday ? 'text-gray-400' : 'text-gray-300'}>
                    <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </button>
              {totalBookings > 0 && (
                <div className="px-4 py-3 space-y-1.5">
                  {dayReservations.map(r => (
                    <MobileWeekCard key={r.id} reservation={r} onDelete={onDelete} onStartEdit={() => onEditingIdChange(r.id)} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Desktop: time-slot grid */}
      <div className="hidden sm:block">
        {/* Day headers */}
        <div className="grid gap-px mb-1" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
          <div />
          {weekDays.map((day) => {
            const iso = toLocalISODate(day)
            const isToday = iso === todayIso
            const count = getReservationsForDate(iso).length
            return (
              <button
                key={iso}
                onClick={() => onSelectDay(day)}
                className={`text-center py-2 px-1 rounded-xl transition-all hover:opacity-80 ${isToday ? 'bg-black text-white' : 'hover:bg-gray-50'}`}
              >
                <div className={`text-[10px] font-semibold uppercase tracking-wide ${isToday ? 'text-gray-300' : 'text-gray-400'}`}>
                  {day.toLocaleDateString('el-GR', { weekday: 'short' })}
                </div>
                <div className={`text-xl font-black mt-0.5 ${isToday ? 'text-white' : 'text-black'}`}>
                  {day.getDate()}
                </div>
                {count > 0 && (
                  <div className={`text-[10px] mt-0.5 font-medium ${isToday ? 'text-gray-300' : 'text-gray-400'}`}>
                    {count} κρατ.
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Time slot rows */}
        {visibleSlots.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-300">Καμία κράτηση αυτή την εβδομάδα</div>
        ) : (
          <div className="border border-gray-100 rounded-2xl overflow-hidden">
            {visibleSlots.map((slot, idx) => (
              <div
                key={slot}
                className={`grid gap-px ${idx < visibleSlots.length - 1 ? 'border-b border-gray-100' : ''}`}
                style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}
              >
                {/* Time label */}
                <div className="flex items-center justify-end pr-3 py-2 text-[11px] font-medium text-gray-400 tabular-nums bg-white">
                  {formatTime(slot)}
                </div>
                {/* Day cells */}
                {weekDays.map((day) => {
                  const iso = toLocalISODate(day)
                  const cellReservations = getReservationsForDate(iso).filter(r => r.start_time.slice(0, 5) === slot)
                  const isToday = iso === todayIso

                  return (
                    <div
                      key={iso}
                      className={`py-1.5 px-1 space-y-1 min-h-[44px] ${isToday ? 'bg-gray-50' : 'bg-white'}`}
                    >
                      {cellReservations.length === 0 ? (
                        <div className="h-full min-h-[28px] flex items-center justify-center">
                          <span className="text-[10px] text-gray-200">—</span>
                        </div>
                      ) : (
                        cellReservations.map(r => (
                          <div key={r.id} className="relative rounded-lg bg-black text-white group">
                            <button
                              onClick={() => onEditingIdChange(r.id)}
                              className="w-full text-left px-2 pr-5 py-1.5"
                            >
                              <span className="text-[11px] font-medium block w-full truncate">{r.name}</span>
                            </button>
                            <button
                              onClick={() => onDelete(r.id)}
                              className="absolute top-1/2 -translate-y-1/2 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-400 p-0.5"
                            >
                              <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                                <path d="M2 3.5h10M3 3.5l.5 8a.5.5 0 00.5.5h6a.5.5 0 00.5-.5l.5-8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                              </svg>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MobileWeekCard({ reservation, onDelete, onStartEdit }: {
  reservation: Reservation
  onDelete: (id: string) => void
  onStartEdit: () => void
}) {
  const [confirming, setConfirming] = useState(false)

  return (
    <div className={`flex items-center justify-between rounded-xl px-3 py-2 border transition-all ${confirming ? 'bg-red-50 border-red-200' : 'bg-black border-gray-900'}`}>
      <div className="flex items-center gap-2 min-w-0">
        <span className={`text-xs font-medium truncate ${confirming ? 'text-red-700' : 'text-white'}`}>{reservation.name}</span>
        <span className={`text-xs flex-shrink-0 ${confirming ? 'text-red-400' : 'text-gray-400'}`}>
          {formatTime(reservation.start_time.slice(0, 5))}
        </span>
      </div>
      {confirming ? (
        <div className="flex gap-2 flex-shrink-0 ml-2">
          <button onClick={() => setConfirming(false)} className="text-xs text-gray-500 font-medium">Άκυρο</button>
          <button onClick={() => onDelete(reservation.id)} className="text-xs text-red-600 font-semibold">Διαγραφή</button>
        </div>
      ) : (
        <div className="flex items-center gap-0.5 flex-shrink-0 ml-1">
          <button onClick={onStartEdit} className="text-gray-500 hover:text-white transition-colors p-1">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M9.5 2.5l2 2M2 10l.5 1.5L4 11l7-7-2-2-7 7z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button onClick={() => setConfirming(true)} className="text-gray-500 hover:text-red-400 transition-colors p-1">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M3 3.5l.5 8a.5.5 0 00.5.5h6a.5.5 0 00.5-.5l.5-8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

