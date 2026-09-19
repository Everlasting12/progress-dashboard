import type { Dashboard, DateKey, MetricValues } from '../types'
import { formatLong } from '../lib/date'
import { formatMetricValue } from '../lib/format'
import { totalActivity } from '../lib/activity'

export function DayTooltip({ dashboard, date, values }: { dashboard: Dashboard; date: DateKey; values?: MetricValues }) {
  return (
    <div>
      <div className="mb-1 font-semibold">{formatLong(date)}</div>
      {values ? (
        <>
          {dashboard.metrics
            .filter((m) => (values[m.id] ?? 0) > 0)
            .map((m) => (
              <div key={m.id} className="flex justify-between gap-4">
                <span className="opacity-70">{m.name}</span>
                <span className="font-mono">{formatMetricValue(m, values[m.id] ?? 0)}</span>
              </div>
            ))}
          <div className="mt-1 flex justify-between gap-4 border-t border-canvas/20 pt-1">
            <span className="opacity-70">Total activity</span>
            <span className="font-mono font-bold">{totalActivity(dashboard, values)}</span>
          </div>
        </>
      ) : (
        <div className="opacity-70">No activity</div>
      )}
    </div>
  )
}
