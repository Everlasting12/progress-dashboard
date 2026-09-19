import type { ActivityFile, DashboardsFile, SettingsFile } from '../types'
import { DEFAULT_SETTINGS } from './defaults'

/* Light shape checks so a hand-edited or corrupted JSON file can't crash the app. */

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

export function asDashboardsFile(raw: unknown): DashboardsFile {
  if (!isObj(raw) || !Array.isArray(raw.dashboards)) throw new Error('dashboards.json has an unexpected format')
  const dashboards = raw.dashboards.filter(
    (d): d is DashboardsFile['dashboards'][number] =>
      isObj(d) && typeof d.id === 'string' && typeof d.name === 'string' && Array.isArray(d.metrics) && isObj(d.threshold),
  )
  return { version: 1, dashboards }
}

export function asActivityFile(raw: unknown): ActivityFile {
  if (!isObj(raw)) throw new Error('activity.json has an unexpected format')
  // Accept both { entries: {...} } and the simpler { dashboardId: { date: values } } shape.
  const source = isObj(raw.entries) ? raw.entries : raw
  const entries: ActivityFile['entries'] = {}
  for (const [dashId, days] of Object.entries(source)) {
    if (dashId === 'version' || !isObj(days)) continue
    for (const [date, e] of Object.entries(days)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isObj(e)) continue
      const values = isObj(e.values) ? e.values : e
      const clean: Record<string, number> = {}
      for (const [k, v] of Object.entries(values)) if (typeof v === 'number') clean[k] = v
      entries[dashId] ??= {}
      entries[dashId]![date] = {
        values: clean,
        note: typeof e.note === 'string' ? e.note : undefined,
        updatedAt: typeof e.updatedAt === 'string' ? e.updatedAt : '1970-01-01T00:00:00.000Z',
      }
    }
  }
  return { version: 1, entries }
}

export function asSettingsFile(raw: unknown): SettingsFile {
  const s = isObj(raw) && isObj(raw.settings) ? raw.settings : {}
  return { version: 1, settings: { ...DEFAULT_SETTINGS, ...(s as object) } }
}
