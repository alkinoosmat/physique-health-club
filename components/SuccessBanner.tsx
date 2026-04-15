'use client'

import { useEffect } from 'react'
import { Reservation } from '@/lib/supabase'
import { formatTime, formatDate } from '@/lib/utils'

interface SuccessBannerProps {
  reservation: Reservation
  onDismiss: () => void
}

export default function SuccessBanner({ reservation, onDismiss }: SuccessBannerProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 6000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4 animate-slide-up">
      <div className="bg-black text-white rounded-2xl px-5 py-4 flex items-start gap-4 shadow-lg">
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8l3.5 3.5L13 4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Η Κράτηση Επιβεβαιώθηκε!</p>
          <p className="text-xs text-gray-300 mt-0.5">
            {reservation.name} · {formatDate(reservation.date)}
          </p>
          <p className="text-xs text-gray-300">
            {formatTime(reservation.start_time.slice(0, 5))} – {formatTime(reservation.end_time.slice(0, 5))}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M11 3L3 11M3 3l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
