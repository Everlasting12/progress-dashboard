import type { Dashboard, DailyActivity } from '../types'
import { useApp } from '../store/AppStore'
import { useEntrySheet } from './EntrySheet'
import { useToast } from './ui/Toast'
import { IconButton } from './ui/Button'
import { Icon } from './ui/Icon'
import { formatDate, relativeDay, weekday, weekdayName } from '../lib/date'
import { formatMetricValue } from '../lib/format'
import { isActive, totalActivity } from '../lib/activity'

export function EntryRow({ dashboard, entry, showDashboard = false }: { dashboard: Dashboard; entry: DailyActivity; showDashboard?: boolean }) {
  const { settings, today, deleteEntry } = useApp()
  const openEntry = useEntrySheet()
  const toast = useToast()
  const active = isActive(dashboard, entry.values)
  const shown = dashboard.metrics.filter((m) => (entry.values[m.id] ?? 0) > 0)

  return (
    <div className="group flex items-start gap-3 px-4 py-3">
      <span
        className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: active ? dashboard.color : 'var(--cell)' }}
        title={active ? 'Active day' : 'Below the activity threshold'}
      />
      <button type="button" onClick={() => openEntry({ dashboardId: dashboard.id, date: entry.date })} className="min-w-0 flex-1 text-left">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-medium">{relativeDay(entry.date, today) ?? formatDate(entry.date, settings.dateFormat)}</span>
          <span className="text-xs text-faint">{weekdayName(weekday(entry.date))}</span>
          {showDashboard && (
            <span className="text-xs text-muted">
              {dashboard.icon} {dashboard.name}
            </span>
          )}
        </div>
        <div className="mt-0.5 text-sm text-muted">
          {shown.length ? shown.map((m) => `${m.name} ${formatMetricValue(m, entry.values[m.id] ?? 0)}`).join(', ') : 'No values'}
        </div>
        {entry.note && <div className="mt-1 line-clamp-2 text-xs text-faint">{entry.note}</div>}
      </button>
      <span className="mt-0.5 font-mono text-sm font-bold tabular">{totalActivity(dashboard, entry.values)}</span>
      <div className="flex opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
        <IconButton label="Edit entry" onClick={() => openEntry({ dashboardId: dashboard.id, date: entry.date })}>
          <Icon name="edit" size={16} />
        </IconButton>
        <IconButton
          label="Delete entry"
          onClick={() => {
            if (!confirm(`Delete the ${dashboard.name} entry for ${formatDate(entry.date, settings.dateFormat)}?`)) return
            deleteEntry(dashboard.id, entry.date)
            toast('Entry deleted')
          }}
        >
          <Icon name="trash" size={16} />
        </IconButton>
      </div>
    </div>
  )
}
