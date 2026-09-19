import { useState } from 'react'
import type { Dashboard, Metric, MetricType } from '../types'
import { Modal } from './ui/Modal'
import { Button, IconButton } from './ui/Button'
import { Icon } from './ui/Icon'
import { Field, Input, Select, Toggle } from './ui/Field'
import { COLORS, ICONS, TEMPLATES, type DashboardTemplate } from '../lib/defaults'
import { TOTAL_METRIC_ID } from '../lib/constants'
import { uid, uniqueId } from '../lib/id'

type DraftMetric = Metric & { key: string; isNew: boolean }

const TYPE_LABELS: Record<MetricType, string> = {
  count: 'Whole number',
  decimal: 'Decimal number',
  duration: 'Hours',
  boolean: 'Yes / no',
}

function toDraft(m: Metric, isNew = false): DraftMetric {
  return { ...m, key: uid('k'), isNew }
}

export function DashboardEditor({
  dashboard,
  existingIds,
  onSave,
  onClose,
}: {
  dashboard: Dashboard | null
  existingIds: string[]
  onSave: (d: Dashboard) => void
  onClose: () => void
}) {
  const creating = !dashboard
  const start: DashboardTemplate = dashboard ?? TEMPLATES[0]!.template
  const [name, setName] = useState(start.name)
  const [description, setDescription] = useState(start.description)
  const [icon, setIcon] = useState(start.icon)
  const [color, setColor] = useState(start.color)
  const [metrics, setMetrics] = useState<DraftMetric[]>(() => start.metrics.map((m) => toDraft(m, creating)))
  const [thresholdMetric, setThresholdMetric] = useState(start.threshold.metricId)
  const [thresholdMin, setThresholdMin] = useState(String(start.threshold.min))
  const [error, setError] = useState('')

  const applyTemplate = (t: DashboardTemplate) => {
    setName(t.name)
    setDescription(t.description)
    setIcon(t.icon)
    setColor(t.color)
    setMetrics(t.metrics.map((m) => toDraft(m, true)))
    setThresholdMetric(t.threshold.metricId)
    setThresholdMin(String(t.threshold.min))
  }

  const update = (key: string, patch: Partial<DraftMetric>) =>
    setMetrics((ms) => ms.map((m) => (m.key === key ? { ...m, ...patch } : m)))

  const move = (i: number, dir: -1 | 1) =>
    setMetrics((ms) => {
      const next = [...ms]
      const j = i + dir
      if (j < 0 || j >= next.length) return ms
      ;[next[i], next[j]] = [next[j]!, next[i]!]
      return next
    })

  const save = () => {
    if (!name.trim()) return setError('Give the dashboard a name.')
    if (!metrics.length) return setError('Add at least one metric.')
    if (metrics.some((m) => !m.name.trim())) return setError('Every metric needs a name.')

    // New metrics get ids derived from their names; existing ids never change,
    // so renaming a metric keeps its history.
    const taken = new Set(metrics.filter((m) => !m.isNew).map((m) => m.id))
    const keyToId = new Map<string, string>()
    const finalMetrics: Metric[] = metrics.map(({ key, isNew, ...m }) => {
      const id = isNew ? uniqueId(m.name, taken) : m.id
      taken.add(id)
      keyToId.set(key, id)
      return { ...m, id, name: m.name.trim(), unit: m.unit.trim(), step: m.step > 0 ? m.step : 1 }
    })
    // Threshold may point at a draft metric's old id or key.
    const byOldId = new Map(metrics.map((m) => [m.id || m.key, keyToId.get(m.key)!]))
    let metricId = thresholdMetric === TOTAL_METRIC_ID ? TOTAL_METRIC_ID : byOldId.get(thresholdMetric)
    if (!metricId) metricId = finalMetrics[0]!.id
    const min = Math.max(0, Number(thresholdMin) || 0)

    const now = new Date().toISOString()
    const id = dashboard?.id ?? uniqueId(name, existingIds)
    onSave({
      id,
      name: name.trim(),
      description: description.trim(),
      icon: icon.trim() || '✨',
      color,
      metrics: finalMetrics,
      threshold: { metricId, min },
      createdAt: dashboard?.createdAt ?? now,
      updatedAt: now,
    })
  }

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={creating ? 'Create dashboard' : `Edit ${dashboard.name}`}
      footer={
        <>
          {error && <p className="mr-auto text-sm text-bad">{error}</p>}
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save}>{creating ? 'Create dashboard' : 'Save changes'}</Button>
        </>
      }
    >
      <div className="space-y-5">
        {creating && (
          <div>
            <p className="mb-2 text-sm font-medium">Start from</p>
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => applyTemplate(t.template)}
                  className="rounded-full border border-line px-3 py-1.5 text-sm text-muted transition hover:border-muted hover:text-ink"
                >
                  {t.template.icon} {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. DSA" autoFocus={creating} />
          </Field>
          <Field label="Description">
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What you're tracking" />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-sm font-medium">Icon</p>
            <div className="flex flex-wrap gap-1">
              {ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  aria-label={`Icon ${i}`}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg transition ${icon === i ? 'bg-raised ring-1 ring-ink' : 'hover:bg-raised'}`}
                >
                  {i}
                </button>
              ))}
              <Input value={icon} onChange={(e) => setIcon(e.target.value.slice(0, 4))} className="!h-9 !w-16 text-center" aria-label="Custom emoji" />
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium">Colour</p>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Colour ${c}`}
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full transition ${color === c ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface' : ''}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">Metrics</p>
            <Button
              size="sm"
              onClick={() =>
                setMetrics((ms) => [
                  ...ms,
                  toDraft({ id: '', name: '', type: 'count', unit: '', step: 1, includeInTotal: ms.length === 0 }, true),
                ])
              }
            >
              <Icon name="plus" size={14} /> Add metric
            </Button>
          </div>
          <div className="space-y-2">
            {metrics.map((m, i) => (
              <div key={m.key} className="rounded-xl border border-line p-3">
                <div className="flex items-center gap-2">
                  <Input value={m.name} onChange={(e) => update(m.key, { name: e.target.value })} placeholder="Metric name" aria-label="Metric name" />
                  <IconButton label="Move up" onClick={() => move(i, -1)} disabled={i === 0}><Icon name="arrowUp" size={16} /></IconButton>
                  <IconButton label="Move down" onClick={() => move(i, 1)} disabled={i === metrics.length - 1}><Icon name="arrowDown" size={16} /></IconButton>
                  <IconButton label="Remove metric" onClick={() => setMetrics((ms) => ms.filter((x) => x.key !== m.key))}><Icon name="trash" size={16} /></IconButton>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-[1.3fr_1fr_0.7fr_auto] sm:items-center">
                  <Select
                    value={m.type}
                    aria-label="Metric type"
                    onChange={(e) => {
                      const type = e.target.value as MetricType
                      update(m.key, { type, step: type === 'duration' ? 0.5 : type === 'decimal' ? 0.5 : 1, unit: type === 'duration' && !m.unit ? 'h' : m.unit })
                    }}
                  >
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                  <Input value={m.unit} onChange={(e) => update(m.key, { unit: e.target.value })} placeholder="Unit (optional)" aria-label="Unit" disabled={m.type === 'boolean'} />
                  <Input type="number" min={0} step="any" value={m.step} onChange={(e) => update(m.key, { step: Number(e.target.value) })} aria-label="Step" title="+/- step" disabled={m.type === 'boolean'} />
                  <label className="flex items-center gap-2 text-sm text-muted">
                    <Toggle checked={m.includeInTotal} onChange={(v) => update(m.key, { includeInTotal: v })} label="Count toward total" />
                    In total
                  </label>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">
            "In total" metrics add up to the day's total activity, which drives heatmap colour and charts. Leave breakdowns like Easy / Medium / Hard out so they aren't counted twice.
          </p>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium">A day counts as active when</p>
          <div className="grid grid-cols-[1fr_auto_6rem] items-center gap-2">
            <Select value={thresholdMetric} onChange={(e) => setThresholdMetric(e.target.value)} aria-label="Threshold metric">
              <option value={TOTAL_METRIC_ID}>Total activity</option>
              {metrics.map((m) => <option key={m.key} value={m.id || m.key}>{m.name || 'Untitled metric'}</option>)}
            </Select>
            <span className="text-sm text-muted">≥</span>
            <Input type="number" min={0} step="any" value={thresholdMin} onChange={(e) => setThresholdMin(e.target.value)} aria-label="Minimum" />
          </div>
        </div>
      </div>
    </Modal>
  )
}
