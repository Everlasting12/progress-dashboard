import { useMemo, useState } from 'react'
import { useApp } from '../store/AppStore'
import { useSelectedDashboard } from '../hooks/useSelectedDashboard'
import { useEntrySheet } from '../components/EntrySheet'
import { Card, EmptyState } from '../components/ui/Card'
import { Select, Input } from '../components/ui/Field'
import { Button } from '../components/ui/Button'
import { EntryRow } from '../components/EntryRow'
import { entriesFor } from '../lib/activity'
import { formatMonth } from '../lib/date'
import type { Dashboard, DailyActivity } from '../types'

const PAGE = 60

export function History() {
  const { dashboards, data, today } = useApp()
  const { id, select } = useSelectedDashboard(true)
  const openEntry = useEntrySheet()
  const [limit, setLimit] = useState(PAGE)
  const [jump, setJump] = useState(today)

  const rows = useMemo(() => {
    const list: { dashboard: Dashboard; entry: DailyActivity }[] = []
    for (const d of dashboards) {
      if (id !== 'all' && d.id !== id) continue
      for (const e of entriesFor(data.activity, d)) list.push({ dashboard: d, entry: e })
    }
    return list.sort((a, b) => (a.entry.date === b.entry.date ? a.dashboard.name.localeCompare(b.dashboard.name) : a.entry.date < b.entry.date ? 1 : -1))
  }, [dashboards, data.activity, id])

  const groups = useMemo(() => {
    const out: { month: string; items: typeof rows }[] = []
    for (const r of rows.slice(0, limit)) {
      const month = r.entry.date.slice(0, 7)
      const last = out[out.length - 1]
      if (last?.month === month) last.items.push(r)
      else out.push({ month, items: [r] })
    }
    return out
  }, [rows, limit])

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">History</h1>
          <p className="mt-1 text-sm text-muted">{rows.length} entries</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={id} onChange={(e) => { select(e.target.value); setLimit(PAGE) }} className="sm:w-52" aria-label="Dashboard">
            <option value="all">All dashboards</option>
            {dashboards.map((d) => <option key={d.id} value={d.id}>{d.icon} {d.name}</option>)}
          </Select>
          <div className="flex gap-2">
            <Input type="date" value={jump} max={today} onChange={(e) => setJump(e.target.value)} aria-label="Date to edit" className="sm:w-40" />
            <Button onClick={() => jump && openEntry({ dashboardId: id === 'all' ? undefined : id, date: jump })}>Open day</Button>
          </div>
        </div>
      </header>

      {groups.length ? (
        groups.map((g) => (
          <section key={g.month}>
            <h2 className="mb-2 text-sm font-semibold text-muted">{formatMonth(`${g.month}-01`)}</h2>
            <Card className="divide-y divide-line">
              {g.items.map(({ dashboard, entry }) => (
                <EntryRow key={`${dashboard.id}-${entry.date}`} dashboard={dashboard} entry={entry} showDashboard={id === 'all'} />
              ))}
            </Card>
          </section>
        ))
      ) : (
        <EmptyState
          title="No entries yet"
          body="Entries you add appear here, newest first. You can edit or delete any of them."
          action={<Button variant="primary" onClick={() => openEntry({ dashboardId: id === 'all' ? undefined : id })}>Add today's progress</Button>}
        />
      )}

      {rows.length > limit && (
        <div className="flex justify-center">
          <Button onClick={() => setLimit((l) => l + PAGE)}>Show older entries</Button>
        </div>
      )}
    </div>
  )
}
