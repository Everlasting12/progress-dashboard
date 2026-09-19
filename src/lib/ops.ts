import type { ActivityFile, DashboardsFile, PendingOp, SettingsFile, Snapshot } from '../types'

/*
 * Pure functions that replay pending operations on top of a file.
 * Replaying (instead of uploading our whole local copy) means edits from
 * other devices survive. For the same record, the newer timestamp wins.
 */

const newer = (a: string | undefined, b: string) => !!a && a > b

export function applyActivityOps(file: ActivityFile, ops: PendingOp[]): ActivityFile {
  const entries = structuredClone(file.entries)
  for (const op of ops) {
    if (op.file !== 'activity') continue
    if (op.kind === 'upsertEntry') {
      const current = entries[op.dashboardId]?.[op.date]
      if (newer(current?.updatedAt, op.entry.updatedAt)) continue
      entries[op.dashboardId] ??= {}
      entries[op.dashboardId]![op.date] = op.entry
    } else if (op.kind === 'deleteEntry') {
      const current = entries[op.dashboardId]?.[op.date]
      if (!current || newer(current.updatedAt, op.ts)) continue
      delete entries[op.dashboardId]![op.date]
      if (Object.keys(entries[op.dashboardId]!).length === 0) delete entries[op.dashboardId]
    } else if (op.kind === 'deleteDashboardEntries') {
      delete entries[op.dashboardId]
    }
  }
  return { version: 1, entries }
}

export function applyDashboardOps(file: DashboardsFile, ops: PendingOp[]): DashboardsFile {
  let dashboards = [...file.dashboards]
  for (const op of ops) {
    if (op.file !== 'dashboards') continue
    if (op.kind === 'upsertDashboard') {
      const i = dashboards.findIndex((d) => d.id === op.dashboard.id)
      if (i === -1) dashboards.push(op.dashboard)
      else if (!newer(dashboards[i]!.updatedAt, op.dashboard.updatedAt)) dashboards[i] = op.dashboard
    } else if (op.kind === 'deleteDashboard') {
      dashboards = dashboards.filter((d) => d.id !== op.dashboardId)
    }
  }
  return { version: 1, dashboards }
}

export function applySettingsOps(file: SettingsFile, ops: PendingOp[]): SettingsFile {
  let settings = { ...file.settings }
  for (const op of ops) {
    if (op.file === 'settings' && op.kind === 'updateSettings') {
      settings = { ...settings, ...op.patch, updatedAt: op.ts }
    }
  }
  return { version: 1, settings }
}

export function applyOps(snapshot: Snapshot, ops: PendingOp[]): Snapshot {
  if (!ops.length) return snapshot
  return {
    dashboards: applyDashboardOps(snapshot.dashboards, ops),
    activity: applyActivityOps(snapshot.activity, ops),
    settings: applySettingsOps(snapshot.settings, ops),
  }
}
