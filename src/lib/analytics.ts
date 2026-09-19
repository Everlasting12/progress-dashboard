import type { Dashboard, DailyActivity, DateKey } from '../types'
import { metricValue } from './activity'
import {
  addDays,
  addMonths,
  diffDays,
  formatDate,
  monthShort,
  parseKey,
  rangeKeys,
  startOfMonth,
  startOfWeek,
  startOfYear,
  weekday,
  weekdayName,
} from './date'

export type RangeId = '7d' | '30d' | '90d' | '6m' | '1y' | 'all'
export type Bucket = 'day' | 'week' | 'month'

export const RANGES: { id: RangeId; label: string }[] = [
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
  { id: '6m', label: '6 months' },
  { id: '1y', label: '1 year' },
  { id: 'all', label: 'All time' },
]

export function rangeStart(range: RangeId, today: DateKey, firstEntry: DateKey | undefined): DateKey {
  switch (range) {
    case '7d':
      return addDays(today, -6)
    case '30d':
      return addDays(today, -29)
    case '90d':
      return addDays(today, -89)
    case '6m':
      return addDays(addMonths(today, -6), 1)
    case '1y':
      return addDays(addMonths(today, -12), 1)
    case 'all':
      return firstEntry && firstEntry < today ? firstEntry : addDays(today, -29)
  }
}

export function defaultBucket(from: DateKey, to: DateKey): Bucket {
  const days = diffDays(to, from) + 1
  if (days <= 92) return 'day'
  if (days <= 400) return 'week'
  return 'month'
}

/** Metric value per day (0 for days with no entry). */
export function dailyValues(dashboard: Dashboard, entries: DailyActivity[], metricId: string): Map<DateKey, number> {
  const map = new Map<DateKey, number>()
  for (const e of entries) map.set(e.date, metricValue(dashboard, e.values, metricId))
  return map
}

export interface SeriesPoint {
  key: DateKey
  label: string
  value: number
  /** 7-point moving average (daily buckets only). */
  avg?: number
}

export function buildSeries(
  daily: Map<DateKey, number>,
  from: DateKey,
  to: DateKey,
  bucket: Bucket,
  weekStart: 0 | 1,
): SeriesPoint[] {
  const buckets = new Map<DateKey, number>()
  for (const day of rangeKeys(from, to)) {
    const k = bucket === 'day' ? day : bucket === 'week' ? startOfWeek(day, weekStart) : startOfMonth(day)
    buckets.set(k, (buckets.get(k) ?? 0) + (daily.get(day) ?? 0))
  }
  const points: SeriesPoint[] = [...buckets.entries()].map(([key, value]) => ({
    key,
    value: round(value),
    label: bucketLabel(key, bucket),
  }))
  if (bucket === 'day') {
    points.forEach((p, i) => {
      const window = points.slice(Math.max(0, i - 6), i + 1)
      p.avg = round(window.reduce((s, x) => s + x.value, 0) / window.length)
    })
  }
  return points
}

function bucketLabel(key: DateKey, bucket: Bucket): string {
  const d = parseKey(key)
  if (bucket === 'month') return `${monthShort(d.getUTCMonth())} ${String(d.getUTCFullYear()).slice(2)}`
  return `${monthShort(d.getUTCMonth())} ${d.getUTCDate()}`
}

export interface RangeSummary {
  total: number
  activeDays: number
  inactiveDays: number
  days: number
  avgPerDay: number
  avgPerActiveDay: number
  best: { date: DateKey; value: number } | null
}

export function summarize(
  daily: Map<DateKey, number>,
  activeDates: Set<DateKey>,
  from: DateKey,
  to: DateKey,
): RangeSummary {
  let total = 0
  let activeDays = 0
  let best: RangeSummary['best'] = null
  const keys = rangeKeys(from, to)
  for (const k of keys) {
    const v = daily.get(k) ?? 0
    total += v
    if (activeDates.has(k)) activeDays++
    if (v > 0 && (!best || v > best.value)) best = { date: k, value: v }
  }
  const days = keys.length
  return {
    total: round(total),
    activeDays,
    inactiveDays: days - activeDays,
    days,
    avgPerDay: round(days ? total / days : 0, 2),
    avgPerActiveDay: round(activeDays ? total / activeDays : 0, 2),
    best,
  }
}

/** Sum of values from `from` to `to` inclusive. */
export function sumBetween(daily: Map<DateKey, number>, from: DateKey, to: DateKey): number {
  let s = 0
  for (const [k, v] of daily) if (k >= from && k <= to) s += v
  return round(s)
}

export function periodTotals(daily: Map<DateKey, number>, today: DateKey, weekStart: 0 | 1) {
  return {
    week: sumBetween(daily, startOfWeek(today, weekStart), today),
    month: sumBetween(daily, startOfMonth(today), today),
    year: sumBetween(daily, startOfYear(today), today),
  }
}

/** Total per weekday, ordered by week start. */
export function weekdayDistribution(
  daily: Map<DateKey, number>,
  from: DateKey,
  to: DateKey,
  weekStart: 0 | 1,
) {
  const totals = [0, 0, 0, 0, 0, 0, 0]
  for (const [k, v] of daily) if (k >= from && k <= to) totals[weekday(k)]! += v
  return Array.from({ length: 7 }, (_, i) => {
    const wd = (i + weekStart) % 7
    return { label: weekdayName(wd, true), value: round(totals[wd] ?? 0) }
  })
}

export function metricBreakdown(dashboard: Dashboard, entries: DailyActivity[], from: DateKey, to: DateKey) {
  return dashboard.metrics
    .filter((m) => m.type !== 'boolean')
    .map((m) => ({
      id: m.id,
      name: m.name,
      unit: m.unit,
      value: round(
        entries.filter((e) => e.date >= from && e.date <= to).reduce((s, e) => s + (Number(e.values[m.id]) || 0), 0),
      ),
    }))
}

export function describeRange(from: DateKey, to: DateKey, fmt: Parameters<typeof formatDate>[1]): string {
  return `${formatDate(from, fmt)} to ${formatDate(to, fmt)}`
}

function round(n: number, digits = 1): number {
  const f = 10 ** digits
  return Math.round(n * f) / f
}
