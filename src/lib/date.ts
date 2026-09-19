import type { DateFormatPreference, DateKey } from '../types'

/*
 * All calendar math works on DateKey strings (YYYY-MM-DD) treated as UTC
 * midnight. The user's timezone is applied exactly once — when working out
 * what "today" is — so there are no off-by-one bugs around local midnight.
 */

const DAY_MS = 86_400_000

export function todayKey(timeZone: string): DateKey {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
  } catch {
    return new Intl.DateTimeFormat('en-CA').format(new Date())
  }
}

export function parseKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1))
}

export function toKey(date: Date): DateKey {
  return date.toISOString().slice(0, 10)
}

export function addDays(key: DateKey, days: number): DateKey {
  return toKey(new Date(parseKey(key).getTime() + days * DAY_MS))
}

export function diffDays(a: DateKey, b: DateKey): number {
  return Math.round((parseKey(a).getTime() - parseKey(b).getTime()) / DAY_MS)
}

/** 0 = Sunday … 6 = Saturday */
export function weekday(key: DateKey): number {
  return parseKey(key).getUTCDay()
}

export function startOfWeek(key: DateKey, weekStart: 0 | 1): DateKey {
  const offset = (weekday(key) - weekStart + 7) % 7
  return addDays(key, -offset)
}

export function startOfMonth(key: DateKey): DateKey {
  return `${key.slice(0, 7)}-01`
}

export function startOfYear(key: DateKey): DateKey {
  return `${key.slice(0, 4)}-01-01`
}

export function addMonths(key: DateKey, months: number): DateKey {
  const d = parseKey(key)
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(d.getUTCDate(), lastDay))
  return toKey(target)
}

export function rangeKeys(from: DateKey, to: DateKey): DateKey[] {
  const out: DateKey[] = []
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k)
  return out
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function monthShort(monthIndex: number): string {
  return MONTHS[monthIndex] ?? ''
}

export function weekdayName(i: number, short = false): string {
  const n = WEEKDAYS[i] ?? ''
  return short ? n.slice(0, 3) : n
}

export function formatDate(key: DateKey, fmt: DateFormatPreference): string {
  const [y, m, d] = key.split('-')
  const mi = Number(m) - 1
  const day = Number(d)
  switch (fmt) {
    case 'MMM d, yyyy':
      return `${MONTHS[mi]} ${day}, ${y}`
    case 'd MMM yyyy':
      return `${day} ${MONTHS[mi]} ${y}`
    case 'dd/MM/yyyy':
      return `${d}/${m}/${y}`
    case 'yyyy-MM-dd':
      return key
  }
}

/** "Saturday, September 19, 2026" — used for headings. */
export function formatLong(key: DateKey): string {
  const [y, m, d] = key.split('-')
  return `${weekdayName(weekday(key))}, ${MONTHS_LONG[Number(m) - 1]} ${Number(d)}, ${y}`
}

export function formatMonth(key: DateKey): string {
  return `${MONTHS_LONG[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`
}

export function relativeDay(key: DateKey, today: DateKey): string | null {
  const diff = diffDays(today, key)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return null
}

export function listTimezones(): string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (k: string) => string[] }
  const zones = intl.supportedValuesOf?.('timeZone') ?? []
  return zones.length ? zones : ['Asia/Kolkata', 'UTC', 'Europe/London', 'America/New_York']
}
