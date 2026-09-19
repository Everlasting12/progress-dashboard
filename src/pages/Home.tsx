import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppStore'
import { useDashboardStats, useOverallStats } from '../hooks/useDashboardStats'
import { useEntrySheet } from '../components/EntrySheet'
import { StreakCards } from '../components/StreakCards'
import { ContributionCalendar } from '../components/ContributionCalendar'
import { activityDetail, summarizeValues } from '../components/DayTimeline'
import { Card, EmptyState, Section } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { SyncErrorBanner } from '../components/SyncBadge'
import { addDays, formatLong } from '../lib/date'
import { formatNumber } from '../lib/format'
import type { Dashboard } from '../types'

export function Home() {
  const { dashboards, today, sync, data } = useApp()
  const overall = useOverallStats()
  const openEntry = useEntrySheet()
  const navigate = useNavigate()

  return (
    <div className="space-y-8">
      <SyncErrorBanner />
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted">{formatLong(today)}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">My progress</h1>
        </div>
        <Button variant="primary" size="lg" onClick={() => openEntry()} className="hidden sm:inline-flex">
          <Icon name="plus" /> Add today's progress
        </Button>
      </header>

      {sync.status === 'local' && (
        <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="font-medium">Connect a GitHub repository to sync</p>
            <p className="text-sm text-muted">Right now your progress is only saved in this browser. Add a repository and token to use it on every device.</p>
          </div>
          <Link to="/settings"><Button>Connect GitHub</Button></Link>
        </Card>
      )}

      <StreakCards streaks={overall.streaks} color="#e07a2f" compact />

      <ContributionCalendar
        values={overall.counts}
        color="#2f9e76"
        firstDate={overall.firstDate}
        info={
          <>
            <p>This calendar combines every dashboard. Each contribution is one dashboard reaching its daily goal, so a day where you did DSA and reading counts as two.</p>
            <p className="mt-2">Click any square to see what you did that day.</p>
          </>
        }
        tooltip={(date) => {
          const list = overall.perDay.get(date)
          return (
            <div>
              <div className="mb-1 font-semibold">{formatLong(date)}</div>
              {list?.length ? (
                list.map(({ dashboard, total }) => (
                  <div key={dashboard.id} className="flex justify-between gap-4">
                    <span className="opacity-70">{dashboard.icon} {dashboard.name}</span>
                    <span className="font-mono">{formatNumber(total)}</span>
                  </div>
                ))
              ) : (
                <div className="opacity-70">No activity</div>
              )}
            </div>
          )
        }}
        itemsFor={(date) =>
          dashboards.flatMap((d) => {
            const e = data.activity.entries[d.id]?.[date]
            if (!e) return []
            return [{
              key: d.id,
              title: <><span aria-hidden>{d.icon}</span> <span className="font-medium">{d.name}</span> <span className="text-muted">· {summarizeValues(d, e.values)}</span></>,
              detail: e.note ? `${activityDetail(d, e.values)} · “${e.note}”` : activityDetail(d, e.values),
              color: d.color,
            }]
          })
        }
        dayAction={(date, has) =>
          date <= today && (
            <Button size="sm" onClick={() => openEntry({ date })}>
              <Icon name={has ? 'edit' : 'plus'} size={14} /> {has ? 'Edit day' : 'Add progress'}
            </Button>
          )
        }
      />

      <Section
        title="Dashboards"
        action={<Link to="/dashboards" className="text-sm text-muted hover:text-ink">Manage</Link>}
      >
        {dashboards.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {dashboards.map((d) => (
              <DashboardCard key={d.id} dashboard={d} onOpen={() => navigate(`/d/${d.id}`)} onAdd={() => openEntry({ dashboardId: d.id })} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No dashboards yet"
            body="A dashboard tracks one area of your life — DSA, reading, workouts — with the metrics you choose."
            action={<Link to="/dashboards"><Button variant="primary">Create a dashboard</Button></Link>}
          />
        )}
      </Section>
    </div>
  )
}

function DashboardCard({ dashboard, onOpen, onAdd }: { dashboard: Dashboard; onOpen: () => void; onAdd: () => void }) {
  const { today } = useApp()
  const stats = useDashboardStats(dashboard)
  if (!stats) return null
  const headline = dashboard.metrics.find((m) => m.includeInTotal && m.type !== 'boolean') ?? dashboard.metrics[0]
  const loggedToday = stats.active.has(today)
  const last14 = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13))
  const max = Math.max(1, ...last14.map((k) => stats.totals.get(k) ?? 0))

  return (
    <Card className="flex flex-col p-4 transition hover:border-muted/60">
      <button type="button" onClick={onOpen} className="text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl" style={{ background: `${dashboard.color}22` }}>
              {dashboard.icon}
            </span>
            <div className="min-w-0">
              <div className="truncate font-semibold">{dashboard.name}</div>
              <div className={`text-xs ${loggedToday ? 'text-ok' : 'text-faint'}`}>{loggedToday ? '✓ Done today' : 'Not logged today'}</div>
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <div>
            <div className="font-mono text-lg font-bold tabular">🔥 {stats.streaks.current}</div>
            <div className="text-xs text-muted">day streak</div>
          </div>
          <div>
            <div className="font-mono text-lg font-bold tabular">{formatNumber(headline ? stats.metricTotals[headline.id] ?? 0 : 0)}</div>
            <div className="truncate text-xs text-muted">{headline?.unit || headline?.name.toLowerCase() || 'total'}</div>
          </div>
          <div>
            <div className="font-mono text-lg font-bold tabular">{stats.streaks.activeDays}</div>
            <div className="text-xs text-muted">active days</div>
          </div>
        </div>
        <div className="mt-4 flex h-8 items-end gap-[3px]" aria-hidden>
          {last14.map((k) => {
            const v = stats.totals.get(k) ?? 0
            return (
              <span
                key={k}
                className="flex-1 rounded-sm"
                style={{ height: `${Math.max(8, (v / max) * 100)}%`, background: v > 0 ? dashboard.color : 'var(--cell)' }}
              />
            )
          })}
        </div>
      </button>
      <div className="mt-4 flex gap-2">
        <Button size="sm" variant="primary" onClick={onAdd} className="flex-1">
          <Icon name="plus" size={14} /> {loggedToday ? 'Update today' : 'Add today'}
        </Button>
        <Button size="sm" onClick={onOpen} className="flex-1">View dashboard</Button>
      </div>
    </Card>
  )
}
