import { useMemo } from 'react'
import type { Dashboard, DateKey } from '../types'
import { useApp } from '../store/AppStore'
import { activeDateSet, entriesFor, totalActivity } from '../lib/activity'
import { computeStreaks } from '../lib/streaks'
import { dailyValues, periodTotals } from '../lib/analytics'
import { TOTAL_METRIC_ID } from '../lib/constants'

/** Everything a dashboard view needs: entries, streaks, totals. */
export function useDashboardStats(dashboard: Dashboard | undefined) {
  const { data, today, settings } = useApp()
  return useMemo(() => {
    if (!dashboard) return null
    const entries = entriesFor(data.activity, dashboard)
    const active = activeDateSet(dashboard, entries, today)
    const streaks = computeStreaks(active, today, settings.streakGraceDays)
    const totals = dailyValues(dashboard, entries, TOTAL_METRIC_ID)
    const metricTotals: Record<string, number> = {}
    for (const m of dashboard.metrics) {
      metricTotals[m.id] = Math.round(entries.reduce((s, e) => s + (Number(e.values[m.id]) || 0), 0) * 100) / 100
    }
    return {
      entries,
      byDate: new Map(entries.map((e) => [e.date, e])),
      active,
      streaks,
      totals,
      metricTotals,
      totalActivity: Math.round(entries.reduce((s, e) => s + totalActivity(dashboard, e.values), 0) * 100) / 100,
      periods: periodTotals(totals, today, settings.weekStart),
    }
  }, [dashboard, data.activity, today, settings.streakGraceDays, settings.weekStart])
}

/** Combined view across dashboards: a day is active if any dashboard was active. */
export function useOverallStats() {
  const { data, dashboards, today, settings } = useApp()
  return useMemo(() => {
    const active = new Set<DateKey>()
    const counts = new Map<DateKey, number>()
    const perDay = new Map<DateKey, { dashboard: Dashboard; total: number }[]>()
    let firstDate: DateKey | undefined
    for (const d of dashboards) {
      for (const e of entriesFor(data.activity, d)) {
        const total = totalActivity(d, e.values)
        if (!firstDate || e.date < firstDate) firstDate = e.date
        if (activeDateSet(d, [e], today).size) {
          active.add(e.date)
          counts.set(e.date, (counts.get(e.date) ?? 0) + 1)
        }
        if (total > 0) {
          const list = perDay.get(e.date) ?? []
          list.push({ dashboard: d, total })
          perDay.set(e.date, list)
        }
      }
    }
    return { active, counts, perDay, firstDate, streaks: computeStreaks(active, today, settings.streakGraceDays) }
  }, [data.activity, dashboards, today, settings.streakGraceDays])
}
