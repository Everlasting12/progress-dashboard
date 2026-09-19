import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { DateKey } from '../types'
import { useApp } from '../store/AppStore'
import { Heatmap } from './Heatmap'
import { Card } from './ui/Card'
import { Select } from './ui/Field'
import { Icon } from './ui/Icon'
import { addDays, addMonths, formatLong } from '../lib/date'
import { formatNumber } from '../lib/format'

export interface TimelineItem {
  key: string
  title: ReactNode
  detail?: ReactNode
  color?: string
}

/**
 * Heatmap card in the style of LeetCode / takeUforward consistency calendars:
 * contribution count + year picker in the header, and a timeline of what
 * happened on the selected day underneath.
 */
export function ContributionCalendar({
  values,
  color,
  firstDate,
  unitLabel = 'contributions',
  info,
  tooltip,
  itemsFor,
  dayAction,
}: {
  values: Map<DateKey, number>
  color: string
  /** Earliest date with data; decides which years appear in the picker. */
  firstDate?: DateKey
  unitLabel?: string
  info: ReactNode
  tooltip: (date: DateKey) => ReactNode
  itemsFor: (date: DateKey) => TimelineItem[]
  dayAction: (date: DateKey, hasItems: boolean) => ReactNode
}) {
  const { today, settings } = useApp()
  const [period, setPeriod] = useState<'last' | string>('last')
  const [selected, setSelected] = useState<DateKey>(today)
  const [showInfo, setShowInfo] = useState(false)
  const infoRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showInfo) return
    const close = (e: MouseEvent) => !infoRef.current?.contains(e.target as Node) && setShowInfo(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [showInfo])

  const years = useMemo(() => {
    const now = Number(today.slice(0, 4))
    const start = Math.min(now, Number((firstDate ?? today).slice(0, 4)))
    return Array.from({ length: now - start + 1 }, (_, i) => String(now - i))
  }, [today, firstDate])

  const [from, to] =
    period === 'last' ? [addDays(addMonths(today, -12), 1), today] : [`${period}-01-01`, `${period}-12-31`]

  const total = useMemo(() => {
    let s = 0
    for (const [k, v] of values) if (k >= from && k <= to && k <= today) s += v
    return s
  }, [values, from, to, today])

  const changePeriod = (p: string) => {
    setPeriod(p)
    // Keep the selection inside the visible range.
    const [f, t] = p === 'last' ? [addDays(addMonths(today, -12), 1), today] : [`${p}-01-01`, `${p}-12-31`]
    if (selected < f || selected > t) setSelected(t < today ? t : today)
  }

  const items = itemsFor(selected)

  return (
    <Card className="overflow-visible">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-5">
        <h2 className="flex items-center gap-2.5 text-base font-semibold sm:text-lg">
          <span aria-hidden className="text-xl">🔥</span>
          <span>
            <span className="font-mono tabular">{formatNumber(total)}</span> {unitLabel} in{' '}
            {period === 'last' ? 'the last year' : period}
          </span>
        </h2>
        <div className="flex items-center gap-2">
          <div ref={infoRef} className="relative">
            <button
              type="button"
              onClick={() => setShowInfo((s) => !s)}
              aria-label="How this calendar works"
              aria-expanded={showInfo}
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-raised hover:text-ink"
            >
              <Icon name="info" size={20} />
            </button>
            {showInfo && (
              <div className="animate-fade absolute right-0 top-11 z-30 w-72 rounded-xl border border-line bg-surface p-4 text-sm text-muted shadow-xl">
                {info}
              </div>
            )}
          </div>
          <div className="relative">
            <Icon name="calendar" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Select value={period} onChange={(e) => changePeriod(e.target.value)} className="w-36 pl-9" aria-label="Period">
              <option value="last">Last year</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </Select>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 sm:px-6">
        <Heatmap
          values={values}
          from={from}
          to={to}
          today={today}
          weekStart={settings.weekStart}
          color={color}
          tooltip={tooltip}
          selected={selected}
          onSelect={setSelected}
        />
      </div>

      <div className="border-t border-line px-4 py-4 sm:px-6 sm:py-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Activity on {formatLong(selected)}</h3>
          {dayAction(selected, items.length > 0)}
        </div>
        {items.length ? (
          <ol className="space-y-4">
            {items.map((item) => (
              <li key={item.key} className="group relative pl-6">
                <span className="absolute left-[5px] top-3 bottom-[-12px] w-0.5 rounded bg-line group-last:hidden" aria-hidden />
                <span className="absolute left-0 top-1.5 h-3 w-3 rounded-full ring-4 ring-surface" style={{ background: item.color ?? '#e07a2f' }} aria-hidden />
                <div className="text-[15px]">{item.title}</div>
                {item.detail && <div className="mt-0.5 text-sm italic text-muted">{item.detail}</div>}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted">{selected === today ? 'Nothing logged yet today.' : 'No activity on this day.'}</p>
        )}
      </div>
    </Card>
  )
}
