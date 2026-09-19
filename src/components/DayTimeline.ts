import type { Dashboard, MetricValues } from '../types'
import { formatMetricValue } from '../lib/format'
import { isActive, thresholdLabel, totalActivity } from '../lib/activity'

/** "Problems solved 3 · Easy 1 · Study hours 1.5 h" — non-zero metrics only. */
export function summarizeValues(dashboard: Dashboard, values: MetricValues): string {
  const parts = dashboard.metrics
    .filter((m) => (values[m.id] ?? 0) > 0)
    .map((m) => {
      if (m.type === 'boolean') return m.name
      // Skip the unit when the name already says it ("Problems solved: 2", not "… 2 problems").
      const unitInName = !!m.unit && m.name.toLowerCase().split(/\W+/).includes(m.unit.toLowerCase())
      return `${m.name}: ${formatMetricValue(unitInName ? { ...m, unit: '' } : m, values[m.id] ?? 0)}`
    })
  return parts.join(' · ') || 'Entry saved with no values'
}

export function activityDetail(dashboard: Dashboard, values: MetricValues): string {
  const total = `Total activity: ${totalActivity(dashboard, values)}`
  return isActive(dashboard, values) ? `${total} · Counts toward your streak` : `${total} · Below the goal (${thresholdLabel(dashboard)})`
}
