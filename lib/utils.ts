export const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
  '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
]

export function getEndTime(startTime: string): string {
  const [hours, minutes] = startTime.split(':').map(Number)
  const endHour = hours + 1
  return `${endHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

export function canCancel(date: string, startTime: string): boolean {
  const now = new Date()
  const bookingDateTime = new Date(`${date}T${startTime}:00`)
  const diffMs = bookingDateTime.getTime() - now.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  return diffHours >= 2
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('el-GR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export function isSlotPast(dateIso: string, slot: string): boolean {
  const now = new Date()
  const [year, month, day] = dateIso.split('-').map(Number)
  const [hour, minute] = slot.split(':').map(Number)
  const slotTime = new Date(year, month - 1, day, hour, minute)
  return slotTime <= now
}

export function isSunday(dateIso: string): boolean {
  const [year, month, day] = dateIso.split('-').map(Number)
  return new Date(year, month - 1, day).getDay() === 0
}

export function toLocalISODate(date: Date): string {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}
