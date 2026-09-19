import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { Dashboard } from '../types'
import { useApp } from '../store/AppStore'
import { useDashboardStats } from '../hooks/useDashboardStats'
import { DashboardEditor } from '../components/DashboardEditor'
import { Card, EmptyState } from '../components/ui/Card'
import { Button, IconButton } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { useToast } from '../components/ui/Toast'
import { thresholdLabel } from '../lib/activity'
import { uniqueId } from '../lib/id'
import { plural } from '../lib/format'

export function Dashboards() {
  const { dashboards, saveDashboard, deleteDashboard, updateSettings, settings } = useApp()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [editing, setEditing] = useState<Dashboard | 'new' | null>(null)

  // /dashboards?edit=<id> opens the editor directly (used by the dashboard page).
  useEffect(() => {
    const id = params.get('edit')
    if (!id) return
    const d = dashboards.find((x) => x.id === id)
    if (d) setEditing(d)
    setParams({}, { replace: true })
  }, [params, dashboards, setParams])

  const duplicate = (d: Dashboard) => {
    const now = new Date().toISOString()
    const name = `${d.name} copy`
    saveDashboard({ ...structuredClone(d), id: uniqueId(name, dashboards.map((x) => x.id)), name, createdAt: now, updatedAt: now })
    toast(`Created "${name}"`)
  }

  const remove = (d: Dashboard) => {
    const typed = prompt(`This permanently deletes "${d.name}" and all of its entries.\n\nType the dashboard name to confirm:`)
    if (typed === null) return
    if (typed.trim() !== d.name) return toast('Name did not match. Nothing was deleted.', 'error')
    deleteDashboard(d.id)
    toast(`Deleted "${d.name}"`)
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Dashboards</h1>
          <p className="mt-1 text-sm text-muted">Each dashboard has its own metrics, active-day rule, heatmap and streaks.</p>
        </div>
        <Button variant="primary" onClick={() => setEditing('new')}><Icon name="plus" size={16} /> New dashboard</Button>
      </header>

      {dashboards.length ? (
        <div className="space-y-3">
          {dashboards.map((d) => (
            <DashboardRow
              key={d.id}
              dashboard={d}
              isDefault={settings.defaultDashboardId === d.id}
              onEdit={() => setEditing(d)}
              onDuplicate={() => duplicate(d)}
              onDelete={() => remove(d)}
              onDefault={() => {
                updateSettings({ defaultDashboardId: d.id })
                toast(`${d.name} is now the default dashboard`)
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="No dashboards yet" body="Start from a template or build your own set of metrics." action={<Button variant="primary" onClick={() => setEditing('new')}>Create a dashboard</Button>} />
      )}

      {editing && (
        <DashboardEditor
          dashboard={editing === 'new' ? null : editing}
          existingIds={dashboards.map((d) => d.id)}
          onClose={() => setEditing(null)}
          onSave={(d) => {
            saveDashboard(d)
            toast(editing === 'new' ? `Created "${d.name}"` : 'Changes saved')
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function DashboardRow({
  dashboard,
  isDefault,
  onEdit,
  onDuplicate,
  onDelete,
  onDefault,
}: {
  dashboard: Dashboard
  isDefault: boolean
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
  onDefault: () => void
}) {
  const stats = useDashboardStats(dashboard)
  return (
    <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
      <Link to={`/d/${dashboard.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl" style={{ background: `${dashboard.color}22` }}>
          {dashboard.icon}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold">{dashboard.name}</span>
            {isDefault && <span className="rounded bg-raised px-1.5 py-0.5 text-[11px] text-muted">Default</span>}
          </div>
          <div className="truncate text-sm text-muted">
            {plural(dashboard.metrics.length, 'metric')} · Active when {thresholdLabel(dashboard)} · {plural(stats?.entries.length ?? 0, 'entry', 'entries')}
          </div>
        </div>
      </Link>
      <div className="flex items-center gap-1 self-end sm:self-auto">
        {!isDefault && <IconButton label="Make default" onClick={onDefault}><Icon name="star" size={16} /></IconButton>}
        <IconButton label="Duplicate" onClick={onDuplicate}><Icon name="copy" size={16} /></IconButton>
        <IconButton label="Delete" onClick={onDelete}><Icon name="trash" size={16} /></IconButton>
        <Button size="sm" onClick={onEdit}><Icon name="edit" size={14} /> Edit</Button>
      </div>
    </Card>
  )
}
