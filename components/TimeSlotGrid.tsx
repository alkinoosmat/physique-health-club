'use client'

import { TIME_SLOTS, formatTime, getEndTime, isSlotPast } from '@/lib/utils'

interface TimeSlotGridProps {
  slotCounts: Record<string, number>
  maxPerSlot: number
  onSelectSlot: (slot: string) => void
  loading: boolean
  selectedDate: string
}

export default function TimeSlotGrid({ slotCounts, maxPerSlot, onSelectSlot, loading, selectedDate }: TimeSlotGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {TIME_SLOTS.map((slot) => (
          <div key={slot} className="h-20 rounded-xl border border-gray-100 bg-gray-50 animate-pulse" />
        ))}
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
        const isUnavailable = isFull || isPast
        const isAlmostFull = remaining <= 2 && remaining > 0 && !isPast
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
              {isPast && !isFull ? (
                <span className="text-xs text-gray-300 font-medium">Παρελθόν</span>
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

            {/* Capacity bar */}
            {!isFull && count > 0 && (
              <div className="absolute bottom-2.5 left-4 right-4">
                <div className="h-0.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isAlmostFull ? 'bg-amber-400' : 'bg-gray-300'}`}
                    style={{ width: `${(count / maxPerSlot) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
