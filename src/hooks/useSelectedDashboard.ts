import { useSearchParams } from 'react-router-dom'
import { useApp } from '../store/AppStore'

/** Dashboard chosen via ?d=<id>, falling back to the default dashboard. */
export function useSelectedDashboard(allowAll = false) {
  const { dashboards, settings } = useApp()
  const [params, setParams] = useSearchParams()
  const raw = params.get('d')
  const fallback = allowAll ? 'all' : settings.defaultDashboardId ?? dashboards[0]?.id ?? ''
  const id = raw === 'all' && allowAll ? 'all' : dashboards.some((d) => d.id === raw) ? raw! : fallback
  const validId = id === 'all' || dashboards.some((d) => d.id === id) ? id : dashboards[0]?.id ?? ''
  const select = (next: string) => {
    const p = new URLSearchParams(params)
    p.set('d', next)
    setParams(p, { replace: true })
  }
  return { id: validId, dashboard: dashboards.find((d) => d.id === validId), select }
}
