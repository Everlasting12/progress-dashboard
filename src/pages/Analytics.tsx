import { useMemo, useState } from 'react'
import { useApp } from '../store/AppStore'
import { useDashboardStats } from '../hooks/useDashboardStats'
import { useSelectedDashboard } from '../hooks/useSelectedDashboard'
import { Card, EmptyState } from '../components/ui/Card'
import { Segmented, Select } from '../components/ui/Field'
import { StatTile } from '../components/StreakCards'
import { HorizontalBars, SeriesBarChart, SimpleLineChart, TrendChart } from '../components/charts/Charts'
import {
  RANGES,
  buildSeries,
  dailyValues,
  defaultBucket,
  metricBreakdown,
  rangeStart,
  summarize,
  weekdayDistribution,
  type RangeId,
} from '../lib/analytics'
import { formatDate } from '../lib/date'
import { formatNumber } from '../lib/format'
import { TOTAL_METRIC_ID } from '../lib/constants'

export function Analytics() {
  const { dashboards, today, settings } = useApp()
  const { dashboard, select } = useSelectedDashboard()
  const stats = useDashboardStats(dashboard)
  const [range, setRange] = useState<RangeId>('30d')
  const [metricId, setMetricId] = useState(TOTAL_METRIC_ID)

  const metric = dashboard?.metrics.find((m) => m.id === metricId)
  const effectiveMetricId = metric ? metricId : TOTAL_METRIC_ID
  const metricName = metric?.name ?? 'Total activity'
  const unit = metric?.unit

  const view = useMemo(() => {
    if (!dashboard || !stats) return null
    const from = rangeStart(range, today, stats.entries[0]?.date)
    const daily = dailyValues(dashboard, stats.entries, effectiveMetricId)
    const bucket = defaultBucket(from, today)
    const series = buildSeries(daily, from, today, bucket, settings.weekStart)
    const weekly = buildSeries(daily, from, today, bucket === 'month' ? 'month' : 'week', settings.weekStart)
    const monthly = buildSeries(daily, from, today, 'month', settings.weekStart)
    return {
      from,
      bucket,
      series,
      weekly,
      monthly,
      summary: summarize(daily, stats.active, from, today),
      weekdays: weekdayDistribution(daily, from, today, settings.weekStart),
      breakdown: metricBreakdown(dashboard, stats.entries, from, today),
    }
  }, [dashboard, stats, range, today, effectiveMetricId, settings.weekStart])

  if (!dashboards.length || !dashboard || !view) {
    return <EmptyState title="No dashboards yet" body="Create a dashboard to see analytics." />
  }

  const color = dashboard.color
  const { summary } = view
  const bucketWord = view.bucket === 'day' ? 'Daily' : view.bucket === 'week' ? 'Weekly' : 'Monthly'

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Analytics</h1>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="grid grid-cols-2 gap-2 md:flex">
            <Select value={dashboard.id} onChange={(e) => { select(e.target.value); setMetricId(TOTAL_METRIC_ID) }} className="md:w-52" aria-label="Dashboard">
              {dashboards.map((d) => <option key={d.id} value={d.id}>{d.icon} {d.name}</option>)}
            </Select>
            <Select value={effectiveMetricId} onChange={(e) => setMetricId(e.target.value)} className="md:w-48" aria-label="Metric">
              <option value={TOTAL_METRIC_ID}>Total activity</option>
              {dashboard.metrics.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </div>
          <Segmented value={range} options={RANGES} onChange={setRange} className="md:ml-auto" />
        </div>
        <p className="text-sm text-muted">
          {formatDate(view.from, settings.dateFormat)} to {formatDate(today, settings.dateFormat)} · {summary.days} days
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label={metric ? `Total ${metricName.toLowerCase()}` : 'Total activity'} value={formatNumber(summary.total)} sub={unit} />
        <StatTile label="Average per day" value={formatNumber(summary.avgPerDay, 2)} />
        <StatTile label="Average per active day" value={formatNumber(summary.avgPerActiveDay, 2)} />
        <StatTile label="Active days" value={formatNumber(summary.activeDays)} sub={`${Math.round((summary.activeDays / Math.max(1, summary.days)) * 100)}% of days`} />
        <StatTile label="Inactive days" value={formatNumber(summary.inactiveDays)} />
        <StatTile label="Best day" value={summary.best ? formatNumber(summary.best.value) : '–'} sub={summary.best ? formatDate(summary.best.date, settings.dateFormat) : undefined} />
      </div>

      <Card className="p-4 sm:p-5">
        <h2 className="mb-3 text-[15px] font-semibold">{bucketWord} trend</h2>
        <TrendChart data={view.series} color={color} name={metricName} unit={unit} height={260} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <h2 className="mb-3 text-[15px] font-semibold">{view.bucket === 'month' ? 'Monthly' : 'Weekly'} summary</h2>
          <SeriesBarChart data={view.weekly} color={color} name={metricName} unit={unit} />
        </Card>
        <Card className="p-4 sm:p-5">
          <h2 className="mb-3 text-[15px] font-semibold">Monthly trend</h2>
          <SimpleLineChart data={view.monthly} color={color} name={metricName} />
        </Card>
        <Card className="p-4 sm:p-5">
          <h2 className="mb-4 text-[15px] font-semibold">By day of week</h2>
          <HorizontalBars data={view.weekdays.map((w) => ({ label: w.label, value: w.value }))} color={color} />
        </Card>
        <Card className="p-4 sm:p-5">
          <h2 className="mb-4 text-[15px] font-semibold">Metric totals in this period</h2>
          {view.breakdown.length ? (
            <HorizontalBars data={view.breakdown.map((b) => ({ label: b.name, value: b.value, unit: b.unit }))} color={color} />
          ) : (
            <p className="text-sm text-muted">This dashboard only has yes/no metrics.</p>
          )}
        </Card>
      </div>
    </div>
  )
}
