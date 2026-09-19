import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { DateKey, MetricValues } from '../types'
import { useApp } from '../store/AppStore'
import { Modal } from './ui/Modal'
import { Button, IconButton } from './ui/Button'
import { Icon } from './ui/Icon'
import { MetricInput } from './MetricInput'
import { SyncBadge } from './SyncBadge'
import { useToast } from './ui/Toast'
import { addDays, formatLong, relativeDay } from '../lib/date'
import { emptyValues, isActive, thresholdLabel, totalActivity } from '../lib/activity'
import { inputClass } from './ui/Field'

interface OpenArgs {
  dashboardId?: string
  date?: DateKey
}

const Ctx = createContext<(args?: OpenArgs) => void>(() => {})
export const useEntrySheet = () => useContext(Ctx)

export function EntrySheetProvider({ children }: { children: ReactNode }) {
  const [args, setArgs] = useState<OpenArgs | null>(null)
  const open = useCallback((a: OpenArgs = {}) => setArgs(a), [])
  return (
    <Ctx.Provider value={open}>
      {children}
      {args && <EntrySheet initial={args} onClose={() => setArgs(null)} />}
    </Ctx.Provider>
  )
}

function EntrySheet({ initial, onClose }: { initial: OpenArgs; onClose: () => void }) {
  const { dashboards, data, today, settings, saveEntry, deleteEntry, sync } = useApp()
  const toast = useToast()
  const [dashboardId, setDashboardId] = useState(
    initial.dashboardId ?? settings.defaultDashboardId ?? dashboards[0]?.id ?? '',
  )
  const [date, setDate] = useState<DateKey>(initial.date && initial.date <= today ? initial.date : today)
  const dashboard = dashboards.find((d) => d.id === dashboardId) ?? dashboards[0]
  const existing = dashboard ? data.activity.entries[dashboard.id]?.[date] : undefined

  const [values, setValues] = useState<MetricValues>({})
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)

  // Load the entry whenever the dashboard or date changes.
  useEffect(() => {
    if (!dashboard) return
    setValues({ ...emptyValues(dashboard.metrics), ...(existing?.values ?? {}) })
    setNote(existing?.note ?? '')
    setSaved(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboard?.id, date])

  // Close automatically once the save has reached GitHub.
  useEffect(() => {
    if (saved && sync.status === 'synced') {
      const t = window.setTimeout(onClose, 900)
      return () => window.clearTimeout(t)
    }
  }, [saved, sync.status, onClose])

  if (!dashboard) {
    return (
      <Modal open onClose={onClose} title="Add progress">
        <p className="text-sm text-muted">Create a dashboard first, then you can log progress to it.</p>
      </Modal>
    )
  }

  const rel = relativeDay(date, today)
  const active = isActive(dashboard, values)

  const save = () => {
    saveEntry(dashboard.id, date, values, note)
    setSaved(true)
    toast('Progress saved')
  }

  const remove = () => {
    if (!confirm(`Delete the ${dashboard.name} entry for ${formatLong(date)}?`)) return
    deleteEntry(dashboard.id, date)
    toast('Entry deleted')
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={existing ? 'Edit progress' : 'Add progress'}
      footer={
        saved ? (
          <div className="flex w-full items-center justify-between gap-3">
            <div className="flex flex-col gap-1 text-sm">
              <span className="inline-flex items-center gap-1.5 font-medium text-ok">
                <Icon name="check" size={16} /> Progress saved
              </span>
              <SyncBadge showRetry />
            </div>
            <Button variant="primary" onClick={onClose}>Done</Button>
          </div>
        ) : (
          <>
            {existing && (
              <Button variant="ghost" onClick={remove} className="mr-auto text-bad hover:text-bad">
                <Icon name="trash" size={16} /> Delete
              </Button>
            )}
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={save}>Save progress</Button>
          </>
        )
      }
    >
      {dashboards.length > 1 && (
        <div className="scroll-thin -mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {dashboards.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDashboardId(d.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
                d.id === dashboard.id ? 'border-ink bg-ink text-canvas' : 'border-line text-muted hover:text-ink'
              }`}
            >
              <span aria-hidden>{d.icon}</span>
              {d.name}
            </button>
          ))}
        </div>
      )}

      <div className="mb-3 flex items-center gap-2 rounded-xl bg-raised p-2">
        <IconButton label="Previous day" onClick={() => setDate(addDays(date, -1))}>
          <Icon name="chevronLeft" />
        </IconButton>
        <label className="relative flex-1 cursor-pointer text-center">
          <div className="text-xs text-muted">{rel ?? ' '}</div>
          <div className="text-sm font-semibold">{formatLong(date)}</div>
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Choose date"
          />
        </label>
        <IconButton label="Next day" onClick={() => setDate(addDays(date, 1))} disabled={date >= today}>
          <Icon name="chevronRight" />
        </IconButton>
      </div>

      <div className="divide-y divide-line">
        {dashboard.metrics.map((m) => (
          <MetricInput
            key={m.id}
            metric={m}
            value={values[m.id] ?? 0}
            onChange={(v) => {
              setSaved(false)
              setValues((prev) => ({ ...prev, [m.id]: v }))
            }}
          />
        ))}
      </div>

      <textarea
        value={note}
        onChange={(e) => {
          setSaved(false)
          setNote(e.target.value)
        }}
        placeholder="Note (optional)"
        rows={2}
        className={`${inputClass} mt-3 h-auto resize-none py-2`}
      />

      <div className="mt-3 flex items-center justify-between text-xs text-muted">
        <span>Total activity: <span className="font-mono font-bold text-ink">{totalActivity(dashboard, values)}</span></span>
        <span className={active ? 'text-ok' : ''}>
          {active ? 'Counts as an active day' : `Active when ${thresholdLabel(dashboard)}`}
        </span>
      </div>
    </Modal>
  )
}
