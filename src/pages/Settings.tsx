import { useRef, useState, type ReactNode } from 'react'
import type { AppSettings, DateFormatPreference, GitHubConfig, Snapshot } from '../types'
import { useApp } from '../store/AppStore'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { Field, Input, Segmented, Select } from '../components/ui/Field'
import { useToast } from '../components/ui/Toast'
import { SyncBadge } from '../components/SyncBadge'
import { GitHubClient, GitHubError } from '../services/github'
import { asActivityFile, asDashboardsFile, asSettingsFile } from '../lib/validate'
import { formatDate, listTimezones, todayKey } from '../lib/date'
import { timeAgo } from '../lib/format'
import { STORAGE_KEYS } from '../lib/constants'

function Group({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </Card>
  )
}

export function Settings() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>
      <GitHubSettings />
      <SyncPanel />
      <AppPreferences />
      <DashboardPreferences />
      <Backup />
    </div>
  )
}

function GitHubSettings() {
  const { github, setGitHub } = useApp()
  const toast = useToast()
  const [draft, setDraft] = useState<Omit<GitHubConfig, 'token'>>({
    username: github?.username ?? '',
    owner: github?.owner ?? '',
    repo: github?.repo ?? '',
    branch: github?.branch ?? 'main',
    dataPath: github?.dataPath ?? 'data',
  })
  const [token, setToken] = useState('')
  const [replacing, setReplacing] = useState(!github?.token)
  const [showToken, setShowToken] = useState(false)
  const [test, setTest] = useState<{ ok: boolean; lines: string[] } | null>(null)
  const [testing, setTesting] = useState(false)

  const set = (k: keyof typeof draft) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setDraft((d) => ({ ...d, [k]: e.target.value.trim() }))
    setTest(null)
  }

  const effective = (): GitHubConfig => ({
    ...draft,
    owner: draft.owner || draft.username,
    token: token.trim() || github?.token || '',
  })

  const missing = (cfg: GitHubConfig) =>
    !cfg.owner ? 'Enter the repository owner.' : !cfg.repo ? 'Enter the repository name.' : !cfg.branch ? 'Enter a branch.' : !cfg.token ? 'Paste a personal access token.' : ''

  const runTest = async () => {
    const cfg = effective()
    const m = missing(cfg)
    if (m) return setTest({ ok: false, lines: [m] })
    setTesting(true)
    try {
      setTest({ ok: true, lines: await new GitHubClient(cfg).testConnection() })
    } catch (e) {
      setTest({ ok: false, lines: [e instanceof GitHubError || e instanceof Error ? e.message : 'Connection failed.'] })
    } finally {
      setTesting(false)
    }
  }

  const save = () => {
    const cfg = effective()
    const m = missing(cfg)
    if (m) return setTest({ ok: false, lines: [m] })
    setGitHub(cfg)
    setToken('')
    setReplacing(false)
    toast('GitHub settings saved. Syncing…', 'info')
  }

  return (
    <Group title="GitHub connection" description="Your progress is stored as JSON files in a GitHub repository. The token stays in this browser only.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="GitHub username">
          <Input value={draft.username} onChange={set('username')} placeholder="your-username" autoComplete="username" />
        </Field>
        <Field label="Repository owner" hint="Usually the same as your username.">
          <Input value={draft.owner} onChange={set('owner')} placeholder={draft.username || 'owner'} />
        </Field>
        <Field label="Repository name">
          <Input value={draft.repo} onChange={set('repo')} placeholder="progress-dashboard" />
        </Field>
        <Field label="Branch">
          <Input value={draft.branch} onChange={set('branch')} placeholder="main" />
        </Field>
        <Field label="Data folder" hint="Where dashboards.json, activity.json and settings.json live.">
          <Input value={draft.dataPath} onChange={set('dataPath')} placeholder="data" />
        </Field>
        <Field
          label="Personal access token"
          hint={<>Fine-grained token with <b>Contents: Read and write</b> on this repository only.</>}
        >
          {replacing ? (
            <div className="relative">
              <Input
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => { setToken(e.target.value); setTest(null) }}
                placeholder="github_pat_…"
                autoComplete="off"
                spellCheck={false}
                className="pr-10 font-mono"
              />
              <button type="button" onClick={() => setShowToken((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-faint hover:text-ink" aria-label={showToken ? 'Hide token' : 'Show token'}>
                <Icon name={showToken ? 'eyeOff' : 'eye'} size={16} />
              </button>
            </div>
          ) : (
            <div className="flex h-10 items-center justify-between rounded-lg border border-line bg-raised px-3 text-sm">
              <span className="font-mono text-muted">•••• {github?.token.slice(-4)}</span>
              <button type="button" onClick={() => setReplacing(true)} className="text-sm font-medium underline underline-offset-2">Replace</button>
            </div>
          )}
        </Field>
      </div>

      {test && (
        <div className={`rounded-lg border px-3 py-2.5 text-sm ${test.ok ? 'border-ok/40 bg-ok/10' : 'border-bad/40 bg-bad/10'}`}>
          {test.lines.map((l, i) => (
            <div key={i} className="flex items-start gap-2">
              <Icon name={test.ok ? 'check' : 'alert'} size={16} className={`mt-0.5 ${test.ok ? 'text-ok' : 'text-bad'}`} />
              {l}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={runTest} disabled={testing}>
          <Icon name="sync" size={16} className={testing ? 'animate-spin' : ''} /> Test GitHub connection
        </Button>
        <Button variant="primary" onClick={save}>Save and sync</Button>
        {github && (
          <Button
            variant="ghost"
            className="sm:ml-auto"
            onClick={() => {
              if (!confirm('Remove the token and repository settings from this browser? Your data on GitHub is not touched.')) return
              setGitHub(null)
              setReplacing(true)
              toast('Disconnected from GitHub', 'info')
            }}
          >
            Disconnect
          </Button>
        )}
      </div>
    </Group>
  )
}

function SyncPanel() {
  const { sync, pendingCount, lastSyncedAt, syncNow, github } = useApp()
  if (!github) return null
  return (
    <Group title="Sync">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 text-sm">
          <SyncBadge />
          <p className="text-muted">
            {lastSyncedAt ? `Last synced ${timeAgo(lastSyncedAt)}` : 'Not synced yet'}
            {pendingCount ? ` · ${pendingCount} change${pendingCount === 1 ? '' : 's'} waiting` : ''}
          </p>
          {sync.status === 'error' && <p className="text-bad">{sync.message}</p>}
        </div>
        <Button onClick={() => void syncNow()} disabled={sync.status === 'syncing'}>
          <Icon name="sync" size={16} className={sync.status === 'syncing' ? 'animate-spin' : ''} /> Sync now
        </Button>
      </div>
    </Group>
  )
}

const DATE_FORMATS: DateFormatPreference[] = ['MMM d, yyyy', 'd MMM yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd']

function AppPreferences() {
  const { settings, updateSettings } = useApp()
  const zones = listTimezones()
  const set = <K extends keyof AppSettings>(k: K, v: AppSettings[K]) => updateSettings({ [k]: v } as Partial<AppSettings>)
  return (
    <Group title="Preferences" description="Saved to settings.json, so they follow you to every device.">
      <Field label="Theme">
        <div>
          <Segmented
            value={settings.theme}
            options={[{ id: 'system', label: 'System' }, { id: 'light', label: 'Light' }, { id: 'dark', label: 'Dark' }]}
            onChange={(v) => set('theme', v)}
          />
        </div>
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Date format">
          <Select value={settings.dateFormat} onChange={(e) => set('dateFormat', e.target.value as DateFormatPreference)}>
            {DATE_FORMATS.map((f) => <option key={f} value={f}>{formatDate('2026-09-19', f)}</option>)}
          </Select>
        </Field>
        <Field label="First day of week">
          <Select value={settings.weekStart} onChange={(e) => set('weekStart', Number(e.target.value) as 0 | 1)}>
            <option value={1}>Monday</option>
            <option value={0}>Sunday</option>
          </Select>
        </Field>
        <Field label="Timezone" hint={`Today's date there: ${todayKey(settings.timezone)}`}>
          <Select value={settings.timezone} onChange={(e) => set('timezone', e.target.value)}>
            {zones.map((z) => <option key={z} value={z}>{z}</option>)}
          </Select>
        </Field>
      </div>
    </Group>
  )
}

function DashboardPreferences() {
  const { settings, updateSettings, dashboards } = useApp()
  return (
    <Group title="Dashboards and streaks">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Default dashboard" hint="Pre-selected when you add progress.">
          <Select value={settings.defaultDashboardId ?? ''} onChange={(e) => updateSettings({ defaultDashboardId: e.target.value || null })}>
            <option value="">First dashboard</option>
            {dashboards.map((d) => <option key={d.id} value={d.id}>{d.icon} {d.name}</option>)}
          </Select>
        </Field>
        <Field
          label="Streak grace period"
          hint="How many days a current streak survives without activity. 0 means the streak resets as soon as today has no activity."
        >
          <Select value={settings.streakGraceDays} onChange={(e) => updateSettings({ streakGraceDays: Number(e.target.value) })}>
            <option value={0}>None (strict)</option>
            <option value={1}>1 day — until the end of today</option>
            <option value={2}>2 days</option>
            <option value={3}>3 days</option>
          </Select>
        </Field>
      </div>
    </Group>
  )
}

function Backup() {
  const { data, importSnapshot, today } = useApp()
  const toast = useToast()
  const file = useRef<HTMLInputElement>(null)

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `progress-backup-${today}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importJson = async (f: File) => {
    try {
      const raw = JSON.parse(await f.text()) as Partial<Record<keyof Snapshot, unknown>>
      const snap: Snapshot = {
        dashboards: asDashboardsFile(raw.dashboards),
        activity: asActivityFile(raw.activity),
        settings: asSettingsFile(raw.settings),
      }
      const n = Object.values(snap.activity.entries).reduce((s, d) => s + Object.keys(d).length, 0)
      if (!confirm(`Import ${snap.dashboards.dashboards.length} dashboards and ${n} entries? Matching entries will be overwritten.`)) return
      importSnapshot(snap)
      toast('Backup imported')
    } catch (e) {
      toast(e instanceof Error ? `Import failed: ${e.message}` : 'Import failed', 'error')
    }
  }

  return (
    <Group title="Backup" description="Download everything as one JSON file, or restore from a previous backup.">
      <div className="flex flex-wrap gap-2">
        <Button onClick={exportJson}><Icon name="download" size={16} /> Export backup</Button>
        <Button onClick={() => file.current?.click()}><Icon name="upload" size={16} /> Import backup</Button>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importJson(f); e.target.value = '' }} />
        <Button
          variant="ghost"
          className="sm:ml-auto"
          onClick={() => {
            if (!confirm('Clear the cached data and unsynced changes on this device? Anything not yet synced to GitHub will be lost. Your GitHub settings are kept.')) return
            localStorage.removeItem(STORAGE_KEYS.cache)
            localStorage.removeItem(STORAGE_KEYS.pending)
            location.reload()
          }}
        >
          Clear data on this device
        </Button>
      </div>
    </Group>
  )
}
