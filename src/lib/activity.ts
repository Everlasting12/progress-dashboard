import type { ActivityFile, Dashboard, DailyActivity, DateKey, Metric, MetricValues } from '../types'
import { TOTAL_METRIC_ID } from './constants'

/** Sum of metrics flagged `includeInTotal`. */
export function totalActivity(dashboard: Dashboard, values: MetricValues): number {
  let sum = 0
  for (const m of dashboard.metrics) {
    if (m.includeInTotal) sum += Number(values[m.id] ?? 0) || 0
  }
  return Math.round(sum * 100) / 100
}

/** Value of the metric the threshold (or any chart) is measured on. */
export function metricValue(dashboard: Dashboard, values: MetricValues, metricId: string): number {
  if (metricId === TOTAL_METRIC_ID) return totalActivity(dashboard, values)
  return Number(values[metricId] ?? 0) || 0
}

/** A day is active when the configured threshold metric reaches its minimum. */
export function isActive(dashboard: Dashboard, values: MetricValues | undefined): boolean {
  if (!values) return false
  const { metricId, min } = dashboard.threshold
  const v = metricValue(dashboard, values, metricId)
  return min <= 0 ? v > 0 : v >= min
}

export function thresholdLabel(dashboard: Dashboard): string {
  const { metricId, min } = dashboard.threshold
  const name =
    metricId === TOTAL_METRIC_ID
      ? 'Total activity'
      : dashboard.metrics.find((m) => m.id === metricId)?.name ?? 'Unknown metric'
  return `${name} ≥ ${min}`
}

export function entriesFor(file: ActivityFile, dashboard: Dashboard): DailyActivity[] {
  const byDate = file.entries[dashboard.id] ?? {}
  return Object.entries(byDate)
    .map(([date, e]) => ({ ...e, date, dashboardId: dashboard.id }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
}

export function activeDateSet(dashboard: Dashboard, entries: DailyActivity[], upTo: DateKey): Set<DateKey> {
  const set = new Set<DateKey>()
  for (const e of entries) if (e.date <= upTo && isActive(dashboard, e.values)) set.add(e.date)
  return set
}

export function emptyValues(metrics: Metric[]): MetricValues {
  return Object.fromEntries(metrics.map((m) => [m.id, 0]))
}

/** Keep only numeric values for metrics that still exist. */
export function cleanValues(metrics: Metric[], values: MetricValues): MetricValues {
  const out: MetricValues = {}
  for (const m of metrics) {
    const raw = Number(values[m.id] ?? 0)
    let v = Number.isFinite(raw) ? Math.max(0, raw) : 0
    if (m.type === 'count') v = Math.round(v)
    if (m.type === 'boolean') v = v > 0 ? 1 : 0
    out[m.id] = Math.round(v * 100) / 100
  }
  return out
}
