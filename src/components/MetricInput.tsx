import type { Metric } from '../types'
import { Icon } from './ui/Icon'
import { Toggle } from './ui/Field'

/** Input for one metric, chosen by metric type: stepper, decimal field, or yes/no switch. */
export function MetricInput({ metric, value, onChange }: { metric: Metric; value: number; onChange: (v: number) => void }) {
  const step = metric.step > 0 ? metric.step : 1
  const set = (v: number) => onChange(Math.max(0, Math.round(v * 100) / 100))

  if (metric.type === 'boolean') {
    return (
      <div className="flex items-center justify-between gap-4 py-2.5">
        <span className="text-sm font-medium">{metric.name}</span>
        <Toggle checked={value > 0} onChange={(c) => onChange(c ? 1 : 0)} label={metric.name} />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{metric.name}</div>
        {metric.unit && <div className="text-xs text-faint">{metric.unit}</div>}
      </div>
      <div className="flex items-center rounded-lg border border-line bg-raised">
        <button
          type="button"
          aria-label={`Decrease ${metric.name}`}
          onClick={() => set(value - step)}
          disabled={value <= 0}
          className="flex h-11 w-11 items-center justify-center text-muted transition hover:text-ink disabled:opacity-30"
        >
          <Icon name="minus" />
        </button>
        <input
          inputMode={metric.type === 'count' ? 'numeric' : 'decimal'}
          aria-label={metric.name}
          value={Number.isFinite(value) ? String(value) : ''}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => {
            const raw = e.target.value.replace(',', '.')
            if (raw === '') return set(0)
            const n = Number(raw)
            if (Number.isFinite(n)) set(metric.type === 'count' ? Math.round(n) : n)
          }}
          className="h-11 w-16 bg-transparent text-center font-mono text-lg font-bold tabular outline-none"
        />
        <button
          type="button"
          aria-label={`Increase ${metric.name}`}
          onClick={() => set(value + step)}
          className="flex h-11 w-11 items-center justify-center text-muted transition hover:text-ink"
        >
          <Icon name="plus" />
        </button>
      </div>
    </div>
  )
}
