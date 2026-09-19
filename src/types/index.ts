/* ------------------------------------------------------------------ *
 * Core data model. Nothing here knows about "DSA" or any specific
 * tracker: a dashboard is just a named list of metrics plus a rule
 * that decides when a day counts as active.
 * ------------------------------------------------------------------ */

/** YYYY-MM-DD in the user's configured timezone. Always a calendar date, never a timestamp. */
export type DateKey = string

export type MetricType = 'count' | 'decimal' | 'duration' | 'boolean'

export interface Metric {
  id: string
  name: string
  type: MetricType
  /** Display unit, e.g. "problems", "h", "km". */
  unit: string
  /** Increment for the +/- stepper. */
  step: number
  /** Whether this metric adds to the dashboard's "total activity" figure. */
  includeInTotal: boolean
}

export interface ActivityThreshold {
  /** A metric id, or TOTAL_METRIC_ID to use the summed total. */
  metricId: string
  /** A day is active when the value is >= min. */
  min: number
}

export interface Dashboard {
  id: string
  name: string
  description: string
  /** An emoji. */
  icon: string
  /** Hex accent colour used for the heatmap and charts. */
  color: string
  metrics: Metric[]
  threshold: ActivityThreshold
  createdAt: string
  updatedAt: string
}

export type MetricValues = Record<string, number>

export interface ActivityEntry {
  values: MetricValues
  note?: string
  /** ISO timestamp of the last edit, used to resolve cross-device conflicts. */
  updatedAt: string
}

/** A single day of activity for one dashboard, as used by the UI. */
export interface DailyActivity extends ActivityEntry {
  dashboardId: string
  date: DateKey
}

export type ThemePreference = 'system' | 'light' | 'dark'
export type DateFormatPreference = 'MMM d, yyyy' | 'd MMM yyyy' | 'dd/MM/yyyy' | 'yyyy-MM-dd'

export interface AppSettings {
  theme: ThemePreference
  dateFormat: DateFormatPreference
  /** 0 = Sunday, 1 = Monday */
  weekStart: 0 | 1
  timezone: string
  defaultDashboardId: string | null
  /** Days a current streak may stay alive without activity (0 = strict). */
  streakGraceDays: number
  updatedAt: string
}

/* ---------------------- Files stored in GitHub --------------------- */

export interface DashboardsFile {
  version: 1
  dashboards: Dashboard[]
}

export interface ActivityFile {
  version: 1
  /** entries[dashboardId][date] */
  entries: Record<string, Record<DateKey, ActivityEntry>>
}

export interface SettingsFile {
  version: 1
  settings: AppSettings
}

export interface Snapshot {
  dashboards: DashboardsFile
  activity: ActivityFile
  settings: SettingsFile
}

export type DataFileName = keyof Snapshot

/* ------------------------- Pending changes ------------------------- */

/**
 * Every edit is recorded as an operation. Operations are replayed on top of
 * the latest remote file at sync time, so edits made on another device are
 * never overwritten wholesale.
 */
export type PendingOp =
  | { id: string; ts: string; file: 'activity'; kind: 'upsertEntry'; dashboardId: string; date: DateKey; entry: ActivityEntry }
  | { id: string; ts: string; file: 'activity'; kind: 'deleteEntry'; dashboardId: string; date: DateKey }
  | { id: string; ts: string; file: 'activity'; kind: 'deleteDashboardEntries'; dashboardId: string }
  | { id: string; ts: string; file: 'dashboards'; kind: 'upsertDashboard'; dashboard: Dashboard }
  | { id: string; ts: string; file: 'dashboards'; kind: 'deleteDashboard'; dashboardId: string }
  | { id: string; ts: string; file: 'settings'; kind: 'updateSettings'; patch: Partial<AppSettings> }

/* ----------------------------- GitHub ------------------------------ */

export interface GitHubConfig {
  username: string
  owner: string
  repo: string
  branch: string
  /** Folder inside the repo that holds the JSON files. */
  dataPath: string
  token: string
}

export type SyncState =
  | { status: 'local' } // GitHub not configured
  | { status: 'synced'; at: string }
  | { status: 'syncing' }
  | { status: 'pending'; count: number }
  | { status: 'offline'; count: number }
  | { status: 'error'; message: string; count: number }

/* ----------------------------- Derived ----------------------------- */

export interface StreakRun {
  start: DateKey
  end: DateKey
  length: number
}

export interface StreakStats {
  current: number
  longest: number
  /** Shortest completed streak; null until one streak has ended. */
  shortest: number | null
  runs: StreakRun[]
  activeDays: number
}
