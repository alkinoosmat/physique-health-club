'use client'

import { toLocalISODate } from '@/lib/utils'

interface DatePickerProps {
  selectedDate: string
  onSelectDate: (date: string) => void
}

export default function DatePicker({ selectedDate, onSelectDate }: DatePickerProps) {
  const today = new Date()
  const days: { date: Date; label: string; iso: string }[] = []

  for (let i = 0; i < 14; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const iso = toLocalISODate(d)
    days.push({
      date: d,
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      iso,
    })
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {days.map(({ date, label, iso }) => {
        const isSelected = iso === selectedDate
        const isToday = iso === toLocalISODate(today)

        return (
          <button
            key={iso}
            onClick={() => onSelectDate(iso)}
            className={`
              flex-shrink-0 flex flex-col items-center justify-center w-14 h-16 rounded-xl border transition-all duration-200
              ${isSelected
                ? 'bg-black text-white border-black'
                : 'bg-white text-black border-gray-200 hover:border-black'
              }
            `}
          >
            <span className={`text-xs font-medium uppercase tracking-wide ${isSelected ? 'text-gray-300' : 'text-gray-400'}`}>
              {label}
            </span>
            <span className="text-lg font-bold leading-tight mt-0.5">
              {date.getDate()}
            </span>
            {isToday && (
              <div className={`w-1 h-1 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-black'}`} />
            )}
          </button>
        )
      })}
    </div>
  )
}
