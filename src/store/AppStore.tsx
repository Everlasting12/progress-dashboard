import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type {
  ActivityEntry,
  AppSettings,
  Dashboard,
  DataFileName,
  DateKey,
  GitHubConfig,
  MetricValues,
  PendingOp,
  Snapshot,
  SyncState,
} from '../types'
import { storage, type CacheState } from '../services/storage'
import { GitHubClient, isConfigured } from '../services/github'
import { pullAll, pushFile, FILE_NAMES } from '../services/sync'
import { applyOps } from '../lib/ops'
import { emptySnapshot } from '../lib/defaults'
import { todayKey } from '../lib/date'
import { uid } from '../lib/id'
import { cleanValues } from '../lib/activity'

interface AppStore {
  data: Snapshot
  dashboards: Dashboard[]
  settings: AppSettings
  today: DateKey
  github: GitHubConfig | null
  sync: SyncState
  pendingCount: number
  lastSyncedAt: string | null

  saveEntry: (dashboardId: string, date: DateKey, values: MetricValues, note?: string) => void
  deleteEntry: (dashboardId: string, date: DateKey) => void
  saveDashboard: (dashboard: Dashboard) => void
  deleteDashboard: (id: string) => void
  updateSettings: (patch: Partial<AppSettings>) => void
  setGitHub: (cfg: GitHubConfig | null) => void
  syncNow: () => Promise<void>
  pull: () => Promise<void>
  importSnapshot: (snapshot: Snapshot) => void
}

const Ctx = createContext<AppStore | null>(null)

const FILE_ORDER: DataFileName[] = ['dashboards', 'settings', 'activity']

function initialCache(): CacheState {
  return storage.loadCache() ?? { snapshot: emptySnapshot(), shas: {}, lastSyncedAt: null }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [github, setGithubState] = useState<GitHubConfig | null>(() => storage.loadGitHub())
  const [cache, setCacheState] = useState<CacheState>(initialCache)
  const [pending, setPendingState] = useState<PendingOp[]>(() => storage.loadPending())
  const [sync, setSync] = useState<SyncState>({ status: 'local' })
  const [today, setToday] = useState<DateKey>(() => todayKey(initialCache().snapshot.settings.settings.timezone))

  // Refs mirror state so async sync code always sees the latest values.
  const githubRef = useRef(github)
  const cacheRef = useRef(cache)
  const pendingRef = useRef(pending)
  const busyRef = useRef(false)
  const rerunRef = useRef(false)
  const timerRef = useRef<number | undefined>(undefined)
  const lastPullRef = useRef(0)

  const setCache = useCallback((update: (c: CacheState) => CacheState) => {
    const next = update(cacheRef.current)
    cacheRef.current = next
    storage.saveCache(next)
    setCacheState(next)
  }, [])

  const setPending = useCallback((update: (p: PendingOp[]) => PendingOp[]) => {
    const next = update(pendingRef.current)
    pendingRef.current = next
    storage.savePending(next)
    setPendingState(next)
  }, [])

  const idleState = useCallback((): SyncState => {
    const count = pendingRef.current.length
    if (!isConfigured(githubRef.current)) return { status: 'local' }
    if (count && !navigator.onLine) return { status: 'offline', count }
    if (count) return { status: 'pending', count }
    return { status: 'synced', at: cacheRef.current.lastSyncedAt ?? new Date().toISOString() }
  }, [])

  /* ------------------------------ Sync ------------------------------ */

  const flush = useCallback(async (): Promise<void> => {
    const cfg = githubRef.current
    if (!isConfigured(cfg)) return setSync({ status: 'local' })
    if (busyRef.current) {
      rerunRef.current = true
      return
    }
    const ops = pendingRef.current
    if (!ops.length) return setSync(idleState())
    if (!navigator.onLine) return setSync({ status: 'offline', count: ops.length })

    busyRef.current = true
    setSync({ status: 'syncing' })
    const gh = new GitHubClient(cfg)
    try {
      for (const name of FILE_ORDER) {
        const fileOps = ops.filter((o) => o.file === name)
        if (!fileOps.length) continue
        const { data, sha } = await pushFile(gh, name, fileOps, cacheRef.current.snapshot[name])
        setCache((c) => ({ ...c, snapshot: { ...c.snapshot, [name]: data }, shas: { ...c.shas, [name]: sha } }))
        const done = new Set(fileOps.map((o) => o.id))
        setPending((p) => p.filter((o) => !done.has(o.id)))
      }
      setCache((c) => ({ ...c, lastSyncedAt: new Date().toISOString() }))
      setSync(idleState())
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error'
      setSync(
        navigator.onLine
          ? { status: 'error', message, count: pendingRef.current.length }
          : { status: 'offline', count: pendingRef.current.length },
      )
    } finally {
      busyRef.current = false
      if (rerunRef.current) {
        rerunRef.current = false
        void flush()
      }
    }
  }, [idleState, setCache, setPending])

  const scheduleFlush = useCallback(
    (delay = 400) => {
      window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => void flush(), delay)
    },
    [flush],
  )

  const pull = useCallback(async (): Promise<void> => {
    const cfg = githubRef.current
    if (!isConfigured(cfg)) return setSync({ status: 'local' })
    if (!navigator.onLine) return setSync({ status: 'offline', count: pendingRef.current.length })
    if (busyRef.current) return
    busyRef.current = true
    setSync({ status: 'syncing' })
    const gh = new GitHubClient(cfg)
    try {
      const res = await pullAll(gh)
      // First run against an empty repo: create the missing files from local data.
      for (const name of res.missing) {
        const local = cacheRef.current.snapshot[name]
        res.shas[name] = await gh.writeJson(FILE_NAMES[name], local, undefined, `data: create ${FILE_NAMES[name]} [skip ci]`)
        ;(res.snapshot as unknown as Record<DataFileName, unknown>)[name] = local
      }
      lastPullRef.current = Date.now()
      setCache(() => ({ snapshot: res.snapshot, shas: res.shas, lastSyncedAt: new Date().toISOString() }))
      setSync(idleState())
    } catch (e) {
      setSync({
        status: 'error',
        message: e instanceof Error ? e.message : 'Unknown error',
        count: pendingRef.current.length,
      })
    } finally {
      busyRef.current = false
    }
    if (pendingRef.current.length) await flush()
  }, [flush, idleState, setCache])

  const syncNow = useCallback(async () => {
    await pull() // pull() flushes pending edits when it finishes
  }, [pull])

  // Initial load, reconnect, periodic retry, refresh when the tab regains focus.
  useEffect(() => {
    void pull()
    const onOnline = () => void flush().then(() => pull())
    const onOffline = () => setSync(idleState())
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      setToday(todayKey(cacheRef.current.snapshot.settings.settings.timezone))
      if (Date.now() - lastPullRef.current > 60_000) void pull()
    }
    const retry = window.setInterval(() => {
      if (pendingRef.current.length && !busyRef.current) void flush()
    }, 30_000)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(retry)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------------------------- Derived ----------------------------- */

  const data = useMemo(() => applyOps(cache.snapshot, pending), [cache.snapshot, pending])
  const settings = data.settings.settings
  const dashboards = data.dashboards.dashboards

  // Keep "today" correct across midnight and timezone changes.
  useEffect(() => {
    setToday(todayKey(settings.timezone))
    const t = window.setInterval(() => setToday(todayKey(settings.timezone)), 60_000)
    return () => window.clearInterval(t)
  }, [settings.timezone])

  // Theme
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = settings.theme === 'dark' || (settings.theme === 'system' && mq.matches)
      document.documentElement.classList.toggle('dark', dark)
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [settings.theme])

  /* ---------------------------- Mutations --------------------------- */

  const enqueue = useCallback(
    (ops: PendingOp[]) => {
      setPending((p) => [...p, ...ops])
      if (isConfigured(githubRef.current)) {
        setSync({ status: 'pending', count: pendingRef.current.length })
        scheduleFlush()
      }
    },
    [scheduleFlush, setPending],
  )

  const now = () => new Date().toISOString()

  const saveEntry = useCallback<AppStore['saveEntry']>(
    (dashboardId, date, values, note) => {
      const dashboard = dashboards.find((d) => d.id === dashboardId)
      if (!dashboard) return
      const ts = now()
      const entry: ActivityEntry = { values: cleanValues(dashboard.metrics, values), updatedAt: ts }
      if (note?.trim()) entry.note = note.trim()
      enqueue([{ id: uid('op_'), ts, file: 'activity', kind: 'upsertEntry', dashboardId, date, entry }])
    },
    [dashboards, enqueue],
  )

  const deleteEntry = useCallback<AppStore['deleteEntry']>(
    (dashboardId, date) => enqueue([{ id: uid('op_'), ts: now(), file: 'activity', kind: 'deleteEntry', dashboardId, date }]),
    [enqueue],
  )

  const saveDashboard = useCallback<AppStore['saveDashboard']>(
    (dashboard) => {
      const ts = now()
      enqueue([{ id: uid('op_'), ts, file: 'dashboards', kind: 'upsertDashboard', dashboard: { ...dashboard, updatedAt: ts } }])
    },
    [enqueue],
  )

  const deleteDashboard = useCallback<AppStore['deleteDashboard']>(
    (id) => {
      const ts = now()
      const ops: PendingOp[] = [
        { id: uid('op_'), ts, file: 'dashboards', kind: 'deleteDashboard', dashboardId: id },
        { id: uid('op_'), ts, file: 'activity', kind: 'deleteDashboardEntries', dashboardId: id },
      ]
      if (settings.defaultDashboardId === id) {
        ops.push({ id: uid('op_'), ts, file: 'settings', kind: 'updateSettings', patch: { defaultDashboardId: null } })
      }
      enqueue(ops)
    },
    [enqueue, settings.defaultDashboardId],
  )

  const updateSettings = useCallback<AppStore['updateSettings']>(
    (patch) => enqueue([{ id: uid('op_'), ts: now(), file: 'settings', kind: 'updateSettings', patch }]),
    [enqueue],
  )

  const importSnapshot = useCallback<AppStore['importSnapshot']>(
    (snap) => {
      const ts = now()
      const ops: PendingOp[] = []
      for (const d of snap.dashboards.dashboards) {
        ops.push({ id: uid('op_'), ts, file: 'dashboards', kind: 'upsertDashboard', dashboard: { ...d, updatedAt: ts } })
      }
      for (const [dashboardId, days] of Object.entries(snap.activity.entries)) {
        for (const [date, entry] of Object.entries(days)) {
          ops.push({ id: uid('op_'), ts, file: 'activity', kind: 'upsertEntry', dashboardId, date, entry: { ...entry, updatedAt: ts } })
        }
      }
      const { updatedAt: _ignored, ...rest } = snap.settings.settings
      ops.push({ id: uid('op_'), ts, file: 'settings', kind: 'updateSettings', patch: rest })
      enqueue(ops)
    },
    [enqueue],
  )

  const setGitHub = useCallback<AppStore['setGitHub']>(
    (cfg) => {
      githubRef.current = cfg
      setGithubState(cfg)
      if (cfg) storage.saveGitHub(cfg)
      else storage.clearGitHub()
      void pull()
    },
    [pull],
  )

  const value: AppStore = {
    data,
    dashboards,
    settings,
    today,
    github,
    sync,
    pendingCount: pending.length,
    lastSyncedAt: cache.lastSyncedAt,
    saveEntry,
    deleteEntry,
    saveDashboard,
    deleteDashboard,
    updateSettings,
    setGitHub,
    syncNow,
    pull,
    importSnapshot,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp(): AppStore {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}
