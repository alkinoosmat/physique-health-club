'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { supabase, Reservation, ClosedPeriod } from '@/lib/supabase'
import { toLocalISODate, formatDate } from '@/lib/utils'
import DatePicker from '@/components/DatePicker'
import TimeSlotGrid from '@/components/TimeSlotGrid'
import BookingModal from '@/components/BookingModal'
import CancelModal from '@/components/CancelModal'
import SuccessBanner from '@/components/SuccessBanner'

export default function Home() {
  // If today is Sunday, default to Monday
  const todayDate = new Date()
  const firstAvailable = new Date(todayDate)
  if (firstAvailable.getDay() === 0) firstAvailable.setDate(firstAvailable.getDate() + 1)
  const today = toLocalISODate(firstAvailable)
  const [selectedDate, setSelectedDate] = useState(today)
  const [slotCounts, setSlotCounts] = useState<Record<string, number>>({})
  const [closedPeriods, setClosedPeriods] = useState<ClosedPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [successReservation, setSuccessReservation] = useState<Reservation | null>(null)

  const MAX_PER_SLOT = 7

  const fetchReservations = useCallback(async (date: string) => {
    setLoading(true)
    const [{ data: resData }, { data: closedData }] = await Promise.all([
      supabase.from('reservations').select('start_time').eq('date', date),
      supabase.from('closed_periods').select('*').gte('date', toLocalISODate(new Date())),
    ])

    const counts: Record<string, number> = {}
    for (const r of (resData || [])) {
      const slot = (r as { start_time: string }).start_time.slice(0, 5)
      counts[slot] = (counts[slot] || 0) + 1
    }
    setSlotCounts(counts)
    setClosedPeriods((closedData as ClosedPeriod[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchReservations(selectedDate)
  }, [selectedDate, fetchReservations])

  function handleDateChange(date: string) {
    setSelectedDate(date)
    setSlotCounts({})
  }

  function handleBookingSuccess(reservation: Reservation) {
    setSelectedSlot(null)
    const slot = reservation.start_time.slice(0, 5)
    setSlotCounts(prev => ({ ...prev, [slot]: (prev[slot] || 0) + 1 }))
    setSuccessReservation(reservation)
  }

  function handleCancelSuccess() {
    fetchReservations(selectedDate)
  }

  return (
    <main className="min-h-screen bg-white overflow-x-hidden">
      {/* Hero / Branding */}
      <div className="border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-2 mb-6">
                <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
                <span className="text-xs font-semibold tracking-[0.2em] uppercase text-gray-400">Health Club</span>
              </div>
              <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-none text-black">
                Physique
              </h1>
              <p className="text-gray-400 mt-3 text-base font-light tracking-wide">
                Κράτησε τη θέση σου. Προπονήσου στο καλύτερό σου.
              </p>
            </div>

            <button
              onClick={() => setShowCancelModal(true)}
              className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-black hover:text-black transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v6M4 4l3-3 3 3M2 9.5A2.5 2.5 0 004.5 12h5A2.5 2.5 0 0012 9.5V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Ακύρωση Κράτησης
            </button>
          </div>
        </div>
      </div>

      {/* Booking Interface */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Date Selector */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Επέλεξε Ημέρα</h2>
              <p className="text-sm text-gray-400 mt-0.5">{formatDate(selectedDate)}</p>
            </div>
          </div>
          <DatePicker selectedDate={selectedDate} onSelectDate={handleDateChange} />
        </div>

        {/* Slots */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold tracking-tight">Διαθέσιμες Ώρες</h2>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-white border border-gray-300" />
                Διαθέσιμο
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-gray-100" />
                Κλειστό
              </div>
            </div>
          </div>

          <TimeSlotGrid
            slotCounts={slotCounts}
            maxPerSlot={MAX_PER_SLOT}
            onSelectSlot={setSelectedSlot}
            loading={loading}
            selectedDate={selectedDate}
            closedPeriods={closedPeriods}
          />
        </div>

        {/* Mobile cancel button */}
        <div className="mt-8 sm:hidden">
          <button
            onClick={() => setShowCancelModal(true)}
            className="w-full py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-black hover:text-black transition-all"
          >
            Ακύρωση Κράτησης
          </button>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-300">© {new Date().getFullYear()} Physique Health Club</p>
          <a
            href="/admin"
            className="text-xs text-gray-300 hover:text-black transition-colors"
          >
            Διαχείριση →
          </a>
        </div>
      </div>

      {/* Modals */}
      {selectedSlot && (
        <BookingModal
          slot={selectedSlot}
          date={selectedDate}
          onClose={() => setSelectedSlot(null)}
          onSuccess={handleBookingSuccess}
        />
      )}

      {showCancelModal && (
        <CancelModal
          onClose={() => setShowCancelModal(false)}
          onSuccess={handleCancelSuccess}
        />
      )}

      {/* Success Banner */}
      {successReservation && (
        <SuccessBanner
          reservation={successReservation}
          onDismiss={() => setSuccessReservation(null)}
        />
      )}
    </main>
  )
}
