'use client'

import { useState } from 'react'
import { supabase, Reservation } from '@/lib/supabase'
import { getEndTime, formatTime, formatDate } from '@/lib/utils'

interface BookingModalProps {
  slot: string
  date: string
  onClose: () => void
  onSuccess: (reservation: Reservation) => void
}

export default function BookingModal({ slot, date, onClose, onSuccess }: BookingModalProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const endTime = getEndTime(slot)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) {
      setError('Please fill in all fields.')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Check capacity
      const { count } = await supabase
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('date', date)
        .eq('start_time', `${slot}:00`)

      if ((count ?? 0) >= 7) {
        setError('This slot just filled up. Please choose another.')
        setLoading(false)
        return
      }

      const { data, error: insertError } = await supabase
        .from('reservations')
        .insert([{
          name: name.trim(),
          phone: phone.trim(),
          date,
          start_time: `${slot}:00`,
          end_time: `${endTime}:00`,
        }])
        .select()
        .single()

      if (insertError) throw insertError

      onSuccess(data)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
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
            <h2 className="text-xl font-bold tracking-tight">Book a Slot</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {formatDate(date)} · {formatTime(slot)} – {formatTime(endTime)}
            </p>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Smith"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors placeholder:text-gray-300"
              required
            />
          </div>

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
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-black text-white text-sm font-medium hover:bg-white hover:text-black hover:border-black border border-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Confirming...' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
