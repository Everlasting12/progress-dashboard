import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  ComposedChart,
} from 'recharts'
import type { ReactNode } from 'react'
import type { SeriesPoint } from '../../lib/analytics'
import { useThemeColors } from '../../hooks/useThemeColors'
import { formatNumber } from '../../lib/format'

function ChartTooltip({ active, payload, label, unit }: { active?: boolean; payload?: { name?: string; value?: number; color?: string }[]; label?: string; unit?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg bg-ink px-3 py-2 text-xs text-canvas shadow-xl">
      <div className="mb-1 font-medium">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-mono font-bold">{formatNumber(p.value ?? 0, 2)}</span>
          {unit ? ` ${unit}` : ''}
        </div>
      ))}
    </div>
  )
}

function useAxis() {
  const c = useThemeColors()
  return {
    c,
    x: { tick: { fill: c.faint, fontSize: 11 }, tickLine: false, axisLine: { stroke: c.line }, minTickGap: 16 },
    y: { tick: { fill: c.faint, fontSize: 11 }, tickLine: false, axisLine: false, width: 36, allowDecimals: true },
    grid: <CartesianGrid vertical={false} stroke={c.line} strokeDasharray="3 3" />,
  }
}

export function ChartFrame({ children, height = 220 }: { children: ReactNode; height?: number }) {
  return <div style={{ height }} className="w-full">{children}</div>
}

export function SeriesBarChart({ data, color, name, unit, height }: { data: SeriesPoint[]; color: string; name: string; unit?: string; height?: number }) {
  const { x, y, grid, c } = useAxis()
  return (
    <ChartFrame height={height}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
          {grid}
          <XAxis dataKey="label" {...x} />
          <YAxis {...y} />
          <Tooltip cursor={{ fill: c.raised }} content={<ChartTooltip unit={unit} />} />
          <Bar dataKey="value" name={name} fill={color} radius={[3, 3, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

export function TrendChart({ data, color, name, unit, height }: { data: SeriesPoint[]; color: string; name: string; unit?: string; height?: number }) {
  const { x, y, grid, c } = useAxis()
  const hasAvg = data.some((d) => d.avg !== undefined)
  return (
    <ChartFrame height={height}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id={`fill-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {grid}
          <XAxis dataKey="label" {...x} />
          <YAxis {...y} />
          <Tooltip cursor={{ stroke: c.line }} content={<ChartTooltip unit={unit} />} />
          <Area type="monotone" dataKey="value" name={name} stroke={color} strokeWidth={2} fill={`url(#fill-${color.slice(1)})`} dot={false} />
          {hasAvg && <Line type="monotone" dataKey="avg" name="7-day average" stroke={c.muted} strokeWidth={1.5} strokeDasharray="4 3" dot={false} />}
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

export function SimpleLineChart({ data, color, name, height }: { data: SeriesPoint[]; color: string; name: string; height?: number }) {
  const { x, y, grid, c } = useAxis()
  return (
    <ChartFrame height={height}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          {grid}
          <XAxis dataKey="label" {...x} />
          <YAxis {...y} />
          <Tooltip cursor={{ stroke: c.line }} content={<ChartTooltip />} />
          <Line type="monotone" dataKey="value" name={name} stroke={color} strokeWidth={2} dot={{ r: 2.5, fill: color }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

export function HorizontalBars({ data, color }: { data: { label: string; value: number; unit?: string }[]; color: string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.label} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate text-muted">{d.label}</span>
          <div className="h-2 overflow-hidden rounded-full bg-raised">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(d.value / max) * 100}%`, background: color }} />
          </div>
          <span className="font-mono text-xs font-bold tabular">
            {formatNumber(d.value, 1)}
            {d.unit ? <span className="font-sans font-normal text-faint"> {d.unit}</span> : null}
          </span>
        </div>
      ))}
    </div>
  )
}
