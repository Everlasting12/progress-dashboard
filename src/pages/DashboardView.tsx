import { Link, useParams } from 'react-router-dom'
import { useMemo } from 'react'
import { useApp } from '../store/AppStore'
import { useDashboardStats } from '../hooks/useDashboardStats'
import { useEntrySheet } from '../components/EntrySheet'
import { StatTile, StreakCards } from '../components/StreakCards'
import { ContributionCalendar, type TimelineItem } from '../components/ContributionCalendar'
import { activityDetail, summarizeValues } from '../components/DayTimeline'
import { DayTooltip } from '../components/DayTooltip'
import { Card, EmptyState, Section } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { SeriesBarChart } from '../components/charts/Charts'
import { EntryRow } from '../components/EntryRow'
import { SyncErrorBanner } from '../components/SyncBadge'
import { buildSeries } from '../lib/analytics'
import { addDays, addMonths, startOfMonth, startOfWeek } from '../lib/date'
import { formatMetricValue, formatNumber } from '../lib/format'
import { thresholdLabel } from '../lib/activity'

export function DashboardView() {
  const { id } = useParams()
  const { dashboards, today, settings } = useApp()
  const dashboard = dashboards.find((d) => d.id === id)
  const stats = useDashboardStats(dashboard)
  const openEntry = useEntrySheet()

  const charts = useMemo(() => {
    if (!stats) return null
    const weekFrom = addDays(startOfWeek(today, settings.weekStart), -11 * 7)
    const monthFrom = startOfMonth(addMonths(today, -11))
    return {
      weekly: buildSeries(stats.totals, weekFrom, today, 'week', settings.weekStart),
      monthly: buildSeries(stats.totals, monthFrom, today, 'month', settings.weekStart),
    }
  }, [stats, today, settings.weekStart])

  if (!dashboard || !stats || !charts) {
    return (
      <EmptyState
        title="Dashboard not found"
        body="It may have been deleted on another device."
        action={<Link to="/"><Button>Back to home</Button></Link>}
      />
    )
  }

  const recent = [...stats.entries].reverse().slice(0, 8)
  const numericMetrics = dashboard.metrics.filter((m) => m.type !== 'boolean')

  return (
    <div className="space-y-8">
      <SyncErrorBanner />
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl" style={{ background: `${dashboard.color}22` }}>
            {dashboard.icon}
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{dashboard.name}</h1>
            {dashboard.description && <p className="mt-0.5 text-muted">{dashboard.description}</p>}
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-raised px-2 py-0.5 text-xs text-muted">
              Active day: {thresholdLabel(dashboard)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/dashboards?edit=${dashboard.id}`}><Button><Icon name="edit" size={16} /> Edit</Button></Link>
          <Button variant="primary" onClick={() => openEntry({ dashboardId: dashboard.id })}>
            <Icon name="plus" size={16} /> Add today's progress
          </Button>
        </div>
      </header>

      <StreakCards streaks={stats.streaks} color={dashboard.color} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile label="Total active days" value={formatNumber(stats.streaks.activeDays)} />
        <StatTile label="Total activity" value={formatNumber(stats.totalActivity)} />
        <StatTile label="This week" value={formatNumber(stats.periods.week)} />
        <StatTile label="This month" value={formatNumber(stats.periods.month)} />
        <StatTile label="This year" value={formatNumber(stats.periods.year)} />
      </div>

      <ContributionCalendar
        values={stats.totals}
        color={dashboard.color}
        firstDate={stats.entries[0]?.date}
        info={
          <>
            <p>Each square is one day. The colour gets stronger as that day's total activity goes up, relative to your own busiest days.</p>
            <p className="mt-2">A day counts toward your streak when <b className="text-ink">{thresholdLabel(dashboard)}</b>.</p>
            <p className="mt-2">Click any square to see what you did that day.</p>
          </>
        }
        tooltip={(date) => <DayTooltip dashboard={dashboard} date={date} values={stats.byDate.get(date)?.values} />}
        itemsFor={(date) => {
          const e = stats.byDate.get(date)
          if (!e) return []
          const items: TimelineItem[] = [
            { key: 'values', title: summarizeValues(dashboard, e.values), detail: activityDetail(dashboard, e.values), color: dashboard.color },
          ]
          if (e.note) items.push({ key: 'note', title: e.note, detail: 'Note', color: '#e07a2f' })
          return items
        }}
        dayAction={(date, has) =>
          date <= today && (
            <Button size="sm" onClick={() => openEntry({ dashboardId: dashboard.id, date })}>
              <Icon name={has ? 'edit' : 'plus'} size={14} /> {has ? 'Edit day' : 'Add progress'}
            </Button>
          )
        }
      />

      {numericMetrics.length > 0 && (
        <Section title="All-time totals">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {numericMetrics.map((m) => (
              <StatTile key={m.id} label={m.name} value={formatMetricValue({ ...m, unit: '' }, stats.metricTotals[m.id] ?? 0)} sub={m.unit || undefined} />
            ))}
          </div>
        </Section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <h2 className="mb-3 text-[15px] font-semibold">Weekly activity</h2>
          <SeriesBarChart data={charts.weekly} color={dashboard.color} name="Total activity" />
        </Card>
        <Card className="p-4 sm:p-5">
          <h2 className="mb-3 text-[15px] font-semibold">Monthly activity</h2>
          <SeriesBarChart data={charts.monthly} color={dashboard.color} name="Total activity" />
        </Card>
      </div>

      <Section
        title="Recent entries"
        action={
          <div className="flex gap-3 text-sm">
            <Link to={`/analytics?d=${dashboard.id}`} className="text-muted hover:text-ink">Analytics</Link>
            <Link to={`/history?d=${dashboard.id}`} className="text-muted hover:text-ink">Full history</Link>
          </div>
        }
      >
        {recent.length ? (
          <Card className="divide-y divide-line">
            {recent.map((e) => <EntryRow key={e.date} dashboard={dashboard} entry={e} />)}
          </Card>
        ) : (
          <EmptyState
            title="Nothing logged yet"
            body="Your first entry starts the heatmap and your streak."
            action={<Button variant="primary" onClick={() => openEntry({ dashboardId: dashboard.id })}>Add today's progress</Button>}
          />
        )}
      </Section>
    </div>
  )
}
