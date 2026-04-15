'use client'

import { TIME_SLOTS, formatTime, getEndTime, isSlotPast } from '@/lib/utils'
import { ClosedPeriod } from '@/lib/supabase'

interface TimeSlotGridProps {
  slotCounts: Record<string, number>
  maxPerSlot: number
  onSelectSlot: (slot: string) => void
  loading: boolean
  selectedDate: string
  closedPeriods?: ClosedPeriod[]
}

export default function TimeSlotGrid({ slotCounts, maxPerSlot, onSelectSlot, loading, selectedDate, closedPeriods = [] }: TimeSlotGridProps) {
  const isDayClosed = closedPeriods.some(p => p.date === selectedDate && p.slot === null)
  function isSlotClosed(slot: string) {
    return closedPeriods.some(p => p.date === selectedDate && p.slot === slot)
  }
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {TIME_SLOTS.map((slot) => (
          <div key={slot} className="h-20 rounded-xl border border-gray-100 bg-gray-50 animate-pulse" />
        ))}
      </div>
    )
  }

  if (isDayClosed) {
    return (
      <div className="py-12 text-center rounded-xl border border-gray-100 bg-gray-50">
        <div className="w-10 h-10 rounded-2xl bg-gray-200 flex items-center justify-center mx-auto mb-3">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="3" width="14" height="13" rx="2" stroke="#9ca3af" strokeWidth="1.4"/>
            <path d="M2 7h14M6 1v3M12 1v3" stroke="#9ca3af" strokeWidth="1.4" strokeLinecap="round"/>
            <path d="M6 11l2 2 4-4" stroke="#9ca3af" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-400">Κλειστό αυτή τη μέρα</p>
        <p className="text-xs text-gray-300 mt-1">Επέλεξε άλλη ημερομηνία</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {TIME_SLOTS.map((slot) => {
        const count = slotCounts[slot] || 0
        const remaining = maxPerSlot - count
        const isFull = remaining <= 0
        const isPast = isSlotPast(selectedDate, slot)
        const isClosed = isSlotClosed(slot)
        const isUnavailable = isFull || isPast || isClosed
        const isAlmostFull = remaining <= 2 && remaining > 0 && !isPast && !isClosed
        const endTime = getEndTime(slot)

        return (
          <button
            key={slot}
            disabled={isUnavailable}
            onClick={() => !isUnavailable && onSelectSlot(slot)}
            className={`
              relative h-20 rounded-xl border text-left px-4 py-3 transition-all duration-200
              ${isUnavailable
                ? 'border-gray-100 bg-gray-50 cursor-not-allowed'
                : 'border-gray-200 bg-white hover:border-black cursor-pointer group'
              }
            `}
          >
            <div className={`text-base font-semibold tracking-tight ${isUnavailable ? 'text-gray-300' : 'text-black'}`}>
              {formatTime(slot)}
            </div>
            <div className={`text-xs mt-0.5 ${isUnavailable ? 'text-gray-300' : 'text-gray-400 group-hover:text-gray-600'}`}>
              έως {formatTime(endTime)}
            </div>

            <div className="absolute top-3 right-3">
              {isClosed ? (
                <span className="text-xs text-gray-300 font-medium">Κλειστό</span>
              ) : isPast && !isFull ? (
                <span className="text-xs text-gray-300 font-medium"></span>
              ) : isFull ? (
                <span className="text-xs text-gray-300 font-medium">Πλήρες</span>
              ) : isAlmostFull ? (
                <span className="text-xs text-amber-500 font-semibold">{remaining} θέσεις</span>
              ) : (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5h6M5 2l3 3-3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              )}
            </div>

            {/* Capacity dots */}
            {!isUnavailable && (
              <div className="absolute bottom-3 left-4 right-4 flex gap-1">
                {Array.from({ length: maxPerSlot }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-1.5 rounded-full transition-all ${
                      i < count
                        ? isAlmostFull ? 'bg-amber-400' : 'bg-gray-800'
                        : 'bg-gray-100'
                    }`}
                  />
                ))}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
