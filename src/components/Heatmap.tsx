import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { DateKey } from '../types'
import { addDays, monthShort, parseKey, startOfWeek, weekdayName } from '../lib/date'

const GAP = 4
const LABEL_W = 40
const ALPHAS = ['', '4d', '80', 'b8', 'ff']

/** GitHub-style quantile levels: thresholds come from the distribution of non-zero days shown. */
function quantileCuts(values: number[]): number[] {
  const pos = values.filter((v) => v > 0).sort((a, b) => a - b)
  if (!pos.length) return [1, 2, 3]
  const q = (p: number) => pos[Math.min(pos.length - 1, Math.floor(p * pos.length))]!
  return [q(0.25), q(0.5), q(0.75)]
}

function levelFor(value: number, cuts: number[]): number {
  if (value <= 0) return 0
  if (value <= cuts[0]!) return 1
  if (value <= cuts[1]!) return 2
  if (value <= cuts[2]!) return 3
  return 4
}

export function Heatmap({
  values,
  from,
  to,
  today,
  weekStart,
  color,
  tooltip,
  selected,
  onSelect,
}: {
  values: Map<DateKey, number>
  /** First and last day shown (inclusive). */
  from: DateKey
  to: DateKey
  today: DateKey
  weekStart: 0 | 1
  color: string
  tooltip: (date: DateKey) => ReactNode
  selected?: DateKey | null
  onSelect?: (date: DateKey) => void
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const grid = useRef<HTMLDivElement>(null)
  const [cell, setCell] = useState(14)
  const [hover, setHover] = useState<{ date: DateKey; x: number; y: number } | null>(null)

  const { columns, months, cuts } = useMemo(() => {
    const first = startOfWeek(from, weekStart)
    const columns: DateKey[][] = []
    for (let start = first; start <= to; start = addDays(start, 7)) {
      columns.push(Array.from({ length: 7 }, (_, d) => addDays(start, d)))
    }
    // A month label sits over the first column whose first in-range day belongs to that month.
    const months: { col: number; label: string }[] = []
    let last = -1
    columns.forEach((col, i) => {
      const day = col.find((k) => k >= from && k <= to)
      if (!day) return
      const m = parseKey(day).getUTCMonth()
      if (m !== last) {
        if (!(months.length === 0 && i === 0 && parseKey(day).getUTCDate() > 21)) months.push({ col: i, label: monthShort(m) })
        last = m
      }
    })
    const shown = columns.flat().filter((k) => k >= from && k <= to && k <= today)
    return { columns, months, cuts: quantileCuts(shown.map((k) => values.get(k) ?? 0)) }
  }, [from, to, today, weekStart, values])

  // Cells grow to fill wide containers (up to 20px) and scroll sideways below 11px.
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const fit = Math.floor((el.clientWidth - LABEL_W - 4) / columns.length - GAP)
      setCell(Math.max(11, Math.min(20, fit)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [columns.length])

  // Keep the most recent weeks in view on small screens.
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const target = selected && selected >= from && selected <= to ? selected : to
    const col = columns.findIndex((c) => c.includes(target))
    el.scrollLeft = Math.max(0, LABEL_W + col * (cell + GAP) - el.clientWidth + cell * 3)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, cell])

  const width = columns.length * (cell + GAP)

  return (
    <div className="relative">
      <div ref={scroller} className="scroll-thin overflow-x-auto pb-1" onMouseLeave={() => setHover(null)}>
        <div ref={grid} className="relative inline-flex" style={{ minWidth: width + LABEL_W }}>
          <div className="sticky left-0 z-10 flex shrink-0 flex-col bg-surface text-xs text-muted" style={{ gap: GAP, width: LABEL_W, paddingTop: 22 }}>
            {Array.from({ length: 7 }, (_, i) => (
              <span key={i} style={{ height: cell, lineHeight: `${cell}px` }}>
                {weekdayName((i + weekStart) % 7, true)}
              </span>
            ))}
          </div>
          <div>
            <div className="relative h-4 text-xs text-muted" style={{ width, marginBottom: 6 }}>
              {months.map((m) => (
                <span key={`${m.col}-${m.label}`} className="absolute" style={{ left: m.col * (cell + GAP) }}>
                  {m.label}
                </span>
              ))}
            </div>
            <div className="flex" style={{ gap: GAP }} role="grid" aria-label="Contribution calendar">
              {columns.map((col, w) => (
                <div key={w} className="flex flex-col" style={{ gap: GAP }} role="row">
                  {col.map((date) => {
                    const outside = date < from || date > to
                    const future = date > today
                    const v = values.get(date) ?? 0
                    const level = future ? 0 : levelFor(v, cuts)
                    const isSel = selected === date
                    return (
                      <button
                        key={date}
                        type="button"
                        role="gridcell"
                        disabled={outside || future}
                        aria-label={`${date}: ${v}`}
                        aria-pressed={isSel}
                        onClick={() => onSelect?.(date)}
                        onMouseEnter={(e) => {
                          const c = e.currentTarget.getBoundingClientRect()
                          const host = grid.current!.getBoundingClientRect()
                          setHover({ date, x: c.left - host.left + cell / 2, y: c.top - host.top })
                        }}
                        className={`rounded-[4px] transition-transform ${
                          outside ? 'invisible' : future ? 'opacity-40' : 'hover:scale-110'
                        } ${isSel ? 'ring-2 ring-ink ring-offset-1 ring-offset-surface' : date === today ? 'ring-1 ring-muted' : ''}`}
                        style={{ width: cell, height: cell, background: level ? `${color}${ALPHAS[level]}` : 'var(--cell)' }}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
          {hover && hover.date <= today && (
            <div
              className="animate-fade pointer-events-none absolute z-20 w-max max-w-[240px] -translate-x-1/2 -translate-y-full rounded-lg bg-ink px-3 py-2 text-xs text-canvas shadow-xl"
              style={{ left: Math.min(Math.max(hover.x, 110), LABEL_W + width - 90), top: hover.y - 8 }}
            >
              {tooltip(hover.date)}
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-xs text-muted">
        Less
        {ALPHAS.map((a, i) => (
          <span key={i} className="rounded-[3px]" style={{ width: 11, height: 11, background: i ? `${color}${a}` : 'var(--cell)' }} />
        ))}
        More
      </div>
    </div>
  )
}
