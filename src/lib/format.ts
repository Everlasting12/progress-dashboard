import type { Metric } from '../types'

export function formatNumber(n: number, maxFractionDigits = 1): string {
  return n.toLocaleString('en-IN', { maximumFractionDigits: maxFractionDigits })
}

export function formatMetricValue(metric: Metric | undefined, value: number): string {
  if (!metric) return formatNumber(value)
  if (metric.type === 'boolean') return value > 0 ? 'Yes' : 'No'
  const n = formatNumber(value, metric.type === 'count' ? 0 : 2)
  return metric.unit ? `${n} ${metric.unit}` : n
}

export function plural(n: number, word: string, pluralWord = `${word}s`): string {
  return `${formatNumber(n)} ${n === 1 ? word : pluralWord}`
}

export function timeAgo(iso: string): string {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 45) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  if (s < 86400) return `${Math.round(s / 3600)} h ago`
  return `${Math.round(s / 86400)} d ago`
}
