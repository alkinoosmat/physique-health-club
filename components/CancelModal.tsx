'use client'

import { useState } from 'react'
import { supabase, Reservation } from '@/lib/supabase'
import { canCancel, formatTime, formatDate } from '@/lib/utils'

interface CancelModalProps {
  onClose: () => void
  onSuccess: (id: string) => void
}

export default function CancelModal({ onClose, onSuccess }: CancelModalProps) {
  const [step, setStep] = useState<'lookup' | 'found'>('lookup')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState('')

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    if (!phone.trim()) return

    setLoading(true)
    setError('')

    try {
      const now = new Date()
      const { data, error: fetchError } = await supabase
        .from('reservations')
        .select('*')
        .eq('phone', phone.trim())
        .gte('date', now.toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })

      if (fetchError) throw fetchError

      if (!data || data.length === 0) {
        setError('No upcoming reservations found for this phone number.')
      } else {
        setReservations(data)
        setStep('found')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel(reservation: Reservation) {
    if (!canCancel(reservation.date, reservation.start_time.slice(0, 5))) {
      setError(`Cannot cancel "${reservation.name}'s" booking — less than 2 hours before the session.`)
      return
    }

    setCancellingId(reservation.id)
    setError('')

    try {
      const { error: deleteError } = await supabase
        .from('reservations')
        .delete()
        .eq('id', reservation.id)

      if (deleteError) throw deleteError

      setSuccessMsg(`Booking cancelled successfully.`)
      setReservations(prev => prev.filter(r => r.id !== reservation.id))
      onSuccess(reservation.id)

      if (reservations.length <= 1) {
        setTimeout(() => onClose(), 1500)
      }
    } catch {
      setError('Could not cancel booking. Please try again.')
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-md animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Cancel Booking</h2>
            <p className="text-sm text-gray-500 mt-0.5">Look up by phone number</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-black hover:bg-gray-100 transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">
          {step === 'lookup' && (
            <form onSubmit={handleLookup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors placeholder:text-gray-300"
                  required
                />
              </div>

              {error && (
                <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-black transition-all"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-black text-white text-sm font-medium hover:bg-white hover:text-black hover:border-black border border-black transition-all disabled:opacity-50"
                >
                  {loading ? 'Looking up...' : 'Find Reservations'}
                </button>
              </div>
            </form>
          )}

          {step === 'found' && (
            <div className="space-y-3">
              {successMsg && (
                <div className="px-4 py-3 rounded-xl bg-green-50 border border-green-100 text-sm text-green-700">
                  {successMsg}
                </div>
              )}
              {error && (
                <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                  {error}
                </div>
              )}

              {reservations.length === 0 && !successMsg && (
                <p className="text-sm text-gray-500 text-center py-4">No reservations remaining.</p>
              )}

              {reservations.map((r) => {
                const cancelable = canCancel(r.date, r.start_time.slice(0, 5))
                return (
                  <div key={r.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200">
                    <div>
                      <p className="text-sm font-medium">{r.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDate(r.date)} · {formatTime(r.start_time.slice(0, 5))} – {formatTime(r.end_time.slice(0, 5))}
                      </p>
                      {!cancelable && (
                        <p className="text-xs text-amber-600 mt-0.5">Less than 2h — cannot cancel</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleCancel(r)}
                      disabled={!cancelable || cancellingId === r.id}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {cancellingId === r.id ? 'Cancelling...' : 'Cancel'}
                    </button>
                  </div>
                )
              })}

              <button
                onClick={() => { setStep('lookup'); setPhone(''); setError(''); setSuccessMsg(''); setReservations([]) }}
                className="w-full py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-black transition-all mt-2"
              >
                Search Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
