'use client'

import { useState, useEffect } from 'react'
import { supabase, ClosedPeriod } from '@/lib/supabase'
import { TIME_SLOTS, formatTime, formatDate, toLocalISODate } from '@/lib/utils'

export default function ClosedPeriodsTab() {
  const [periods, setPeriods] = useState<ClosedPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Form state
  const [label, setLabel] = useState('')
  const [date, setDate] = useState('')
  const [slotMode, setSlotMode] = useState<'day' | 'slot'>('day')
  const [slot, setSlot] = useState(TIME_SLOTS[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const todayIso = toLocalISODate(new Date())

  useEffect(() => {
    fetchPeriods()
  }, [])

  async function fetchPeriods() {
    setLoading(true)
    const { data } = await supabase
      .from('closed_periods')
      .select('*')
      .order('date', { ascending: true })
      .order('slot', { ascending: true, nullsFirst: true })
    setPeriods((data as ClosedPeriod[]) || [])
    setLoading(false)
  }

  async function handleAdd() {
    if (!label.trim() || !date) { setError('Συμπλήρωσε όνομα και ημερομηνία.'); return }
    setSaving(true)
    setError('')
    const { data, error: insertError } = await supabase
      .from('closed_periods')
      .insert({
        label: label.trim(),
        date,
        slot: slotMode === 'slot' ? slot : null,
      })
      .select()
      .single()

    if (insertError) {
      setError('Σφάλμα αποθήκευσης.')
    } else if (data) {
      setPeriods(prev => [...prev, data as ClosedPeriod].sort((a, b) =>
        a.date.localeCompare(b.date) || (a.slot ?? '').localeCompare(b.slot ?? '')
      ))
      setLabel('')
      setDate('')
      setSlotMode('day')
      setSlot(TIME_SLOTS[0])
      setAdding(false)
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await supabase.from('closed_periods').delete().eq('id', id)
    setPeriods(prev => prev.filter(p => p.id !== id))
    setDeletingId(null)
  }

  async function handleUpdate(id: string, fields: { label: string; date: string; slot: string | null }) {
    const { data, error: updateError } = await supabase
      .from('closed_periods')
      .update(fields)
      .eq('id', id)
      .select()
      .single()
    if (!updateError && data) {
      setPeriods(prev => prev.map(p => p.id === id ? data as ClosedPeriod : p).sort((a, b) =>
        a.date.localeCompare(b.date) || (a.slot ?? '').localeCompare(b.slot ?? '')
      ))
    }
  }

  // Group by date
  const grouped: Record<string, ClosedPeriod[]> = {}
  for (const p of periods) {
    if (!grouped[p.date]) grouped[p.date] = []
    grouped[p.date].push(p)
  }

  const upcoming = periods.filter(p => p.date >= todayIso)
  const past = periods.filter(p => p.date < todayIso)

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400">
            {upcoming.length > 0
              ? `${upcoming.length} επερχόμεν${upcoming.length === 1 ? 'η' : 'ες'} κλειστ${upcoming.length === 1 ? 'ή' : 'ές'} περίοδοι`
              : 'Δεν υπάρχουν επερχόμενες κλειστές περίοδοι'}
          </p>
        </div>
        <button
          onClick={() => { setAdding(a => !a); setError('') }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black text-white text-sm font-medium hover:bg-white hover:text-black border border-black transition-all"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {adding ? 'Άκυρο' : 'Νέα κλειστή περίοδος'}
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="rounded-2xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-sm font-bold">Νέα κλειστή περίοδος</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1">Περιγραφή</label>
              <input
                autoFocus
                type="text"
                value={label}
                onChange={e => { setLabel(e.target.value); setError('') }}
                placeholder="π.χ. Πρωτοχρονιά, Πάσχα…"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors placeholder:text-gray-300"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1">Ημερομηνία</label>
              <input
                type="date"
                value={date}
                min={todayIso}
                onChange={e => { setDate(e.target.value); setError('') }}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors"
              />
            </div>
          </div>

          {/* Day vs slot toggle */}
          <div>
            <label className="block text-[11px] font-medium text-gray-400 mb-2">Τι κλείνει;</label>
            <div className="flex rounded-xl border border-gray-200 overflow-hidden w-fit">
              <button
                onClick={() => setSlotMode('day')}
                className={`px-4 py-2 text-sm font-medium transition-all ${slotMode === 'day' ? 'bg-black text-white' : 'bg-white text-gray-500 hover:text-black'}`}
              >
                Ολόκληρη η μέρα
              </button>
              <button
                onClick={() => setSlotMode('slot')}
                className={`px-4 py-2 text-sm font-medium transition-all ${slotMode === 'slot' ? 'bg-black text-white' : 'bg-white text-gray-500 hover:text-black'}`}
              >
                Συγκεκριμένη ώρα
              </button>
            </div>
          </div>

          {slotMode === 'slot' && (
            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1">Ώρα</label>
              <select
                value={slot}
                onChange={e => setSlot(e.target.value)}
                className="w-full sm:w-48 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black bg-white transition-colors"
              >
                {TIME_SLOTS.map(s => (
                  <option key={s} value={s}>{formatTime(s)} – {formatTime(`${(parseInt(s) + 1).toString().padStart(2, '0')}:00`)}</option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            onClick={handleAdd}
            disabled={saving}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-black text-white text-sm font-medium hover:bg-white hover:text-black border border-black transition-all disabled:opacity-50"
          >
            {saving ? 'Αποθήκευση…' : 'Αποθήκευση'}
          </button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl border border-gray-100 bg-gray-50 animate-pulse" />
          ))}
        </div>
      ) : periods.length === 0 ? (
        <div className="py-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="3" width="16" height="15" rx="2" stroke="#9ca3af" strokeWidth="1.5"/>
              <path d="M2 8h16M7 1v4M13 1v4M6 12h2M9 12h2M12 12h2M6 15h2M9 15h2" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="text-sm text-gray-400">Δεν υπάρχουν κλειστές περίοδοι.</p>
          <p className="text-xs text-gray-300 mt-1">Πρόσθεσε αργίες ή ειδικές ημέρες.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-black" />
                <p className="text-[11px] font-semibold uppercase tracking-widest text-black">Επερχόμενες</p>
              </div>
              <div className="space-y-2">
                {upcoming.map(p => (
                  <ClosedPeriodRow key={p.id} period={p} onDelete={handleDelete} onUpdate={handleUpdate} deletingId={deletingId} />
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Παρελθόν</p>
              </div>
              <div className="space-y-2">
                {past.map(p => (
                  <ClosedPeriodRow key={p.id} period={p} onDelete={handleDelete} onUpdate={handleUpdate} deletingId={deletingId} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ClosedPeriodRow({ period, onDelete, onUpdate, deletingId }: {
  period: ClosedPeriod
  onDelete: (id: string) => Promise<void>
  onUpdate: (id: string, fields: { label: string; date: string; slot: string | null }) => Promise<void>
  deletingId: string | null
}) {
  const [confirming, setConfirming] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editLabel, setEditLabel] = useState(period.label)
  const [editDate, setEditDate] = useState(period.date)
  const [editSlotMode, setEditSlotMode] = useState<'day' | 'slot'>(period.slot ? 'slot' : 'day')
  const [editSlot, setEditSlot] = useState(period.slot ?? TIME_SLOTS[0])
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const isDeleting = deletingId === period.id
  const todayIso = toLocalISODate(new Date())
  const isPast = period.date < todayIso

  function startEdit() {
    setEditLabel(period.label)
    setEditDate(period.date)
    setEditSlotMode(period.slot ? 'slot' : 'day')
    setEditSlot(period.slot ?? TIME_SLOTS[0])
    setEditError('')
    setEditing(true)
  }

  async function handleSave() {
    if (!editLabel.trim() || !editDate) { setEditError('Συμπλήρωσε όνομα και ημερομηνία.'); return }
    setSaving(true)
    setEditError('')
    await onUpdate(period.id, {
      label: editLabel.trim(),
      date: editDate,
      slot: editSlotMode === 'slot' ? editSlot : null,
    })
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="rounded-xl border border-black bg-white p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-gray-400 mb-1">Περιγραφή</label>
            <input
              autoFocus
              type="text"
              value={editLabel}
              onChange={e => { setEditLabel(e.target.value); setEditError('') }}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-400 mb-1">Ημερομηνία</label>
            <input
              type="date"
              value={editDate}
              onChange={e => { setEditDate(e.target.value); setEditError('') }}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-gray-400 mb-2">Τι κλείνει;</label>
          <div className="flex rounded-xl border border-gray-200 overflow-hidden w-fit">
            <button
              type="button"
              onClick={() => setEditSlotMode('day')}
              className={`px-4 py-2 text-sm font-medium transition-all ${editSlotMode === 'day' ? 'bg-black text-white' : 'bg-white text-gray-500 hover:text-black'}`}
            >
              Ολόκληρη η μέρα
            </button>
            <button
              type="button"
              onClick={() => setEditSlotMode('slot')}
              className={`px-4 py-2 text-sm font-medium transition-all ${editSlotMode === 'slot' ? 'bg-black text-white' : 'bg-white text-gray-500 hover:text-black'}`}
            >
              Συγκεκριμένη ώρα
            </button>
          </div>
        </div>

        {editSlotMode === 'slot' && (
          <div>
            <label className="block text-[11px] font-medium text-gray-400 mb-1">Ώρα</label>
            <select
              value={editSlot}
              onChange={e => setEditSlot(e.target.value)}
              className="w-full sm:w-48 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black bg-white transition-colors"
            >
              {TIME_SLOTS.map(s => (
                <option key={s} value={s}>{formatTime(s)} – {formatTime(`${(parseInt(s) + 1).toString().padStart(2, '0')}:00`)}</option>
              ))}
            </select>
          </div>
        )}

        {editError && <p className="text-xs text-red-500">{editError}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:border-gray-400 hover:text-black transition-all"
          >
            Άκυρο
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-black text-white text-sm font-medium hover:bg-white hover:text-black border border-black transition-all disabled:opacity-50"
          >
            {saving ? 'Αποθήκευση…' : 'Αποθήκευση'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-all ${isPast ? 'border-gray-100 bg-gray-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isPast ? 'bg-gray-100' : 'bg-black'}`}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="2" width="12" height="10" rx="1.5" stroke={isPast ? '#9ca3af' : 'white'} strokeWidth="1.2"/>
            <path d="M1 5.5h12M4.5 1v2.5M9.5 1v2.5" stroke={isPast ? '#9ca3af' : 'white'} strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-semibold truncate ${isPast ? 'text-gray-400' : 'text-black'}`}>{period.label}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-gray-400">{formatDate(period.date)}</p>
            {period.slot ? (
              <>
                <span className="text-gray-200">·</span>
                <span className="text-xs text-gray-400">{formatTime(period.slot)} – {formatTime(`${(parseInt(period.slot) + 1).toString().padStart(2, '0')}:00`)}</span>
              </>
            ) : (
              <>
                <span className="text-gray-200">·</span>
                <span className="text-xs font-medium text-gray-500">Ολόκληρη η μέρα</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0 ml-3">
        {confirming ? (
          <>
            <button onClick={() => setConfirming(false)} className="text-xs text-gray-400 hover:text-black px-2 py-1 transition-colors">Άκυρο</button>
            <button
              onClick={() => onDelete(period.id)}
              disabled={isDeleting}
              className="text-xs text-red-500 font-semibold px-2 py-1 hover:text-red-700 transition-colors disabled:opacity-50"
            >
              {isDeleting ? '…' : 'Διαγραφή'}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={startEdit}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-300 hover:text-black transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              onClick={() => setConfirming(true)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M3 3.5l.5 8a.5.5 0 00.5.5h6a.5.5 0 00.5-.5l.5-8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
