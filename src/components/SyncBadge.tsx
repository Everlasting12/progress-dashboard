import { Link } from 'react-router-dom'
import { useApp } from '../store/AppStore'
import { Icon } from './ui/Icon'
import { timeAgo } from '../lib/format'

export function SyncBadge({ showRetry = false }: { showRetry?: boolean }) {
  const { sync, syncNow, pendingCount } = useApp()

  let tone = 'text-muted'
  let icon: 'check' | 'sync' | 'cloudOff' | 'alert' = 'sync'
  let text = ''
  let title = ''
  switch (sync.status) {
    case 'local':
      icon = 'cloudOff'
      tone = 'text-warn'
      text = pendingCount ? `Local only · ${pendingCount} unsynced` : 'Local only'
      title = 'Connect GitHub in Settings to sync across devices'
      break
    case 'synced':
      icon = 'check'
      tone = 'text-ok'
      text = 'Synced with GitHub'
      title = `Last synced ${timeAgo(sync.at)}`
      break
    case 'syncing':
      text = 'Syncing…'
      break
    case 'pending':
      tone = 'text-warn'
      text = `Pending sync (${sync.count})`
      break
    case 'offline':
      icon = 'cloudOff'
      tone = 'text-warn'
      text = `Offline · ${sync.count} pending`
      title = 'Changes are saved on this device and will sync when you are back online'
      break
    case 'error':
      icon = 'alert'
      tone = 'text-bad'
      text = 'Sync failed'
      title = sync.message
      break
  }

  const badge = (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${tone}`} title={title}>
      <Icon name={icon} size={14} className={sync.status === 'syncing' ? 'animate-spin' : ''} />
      {text}
    </span>
  )

  if (sync.status === 'local') return <Link to="/settings">{badge}</Link>
  return (
    <span className="inline-flex items-center gap-2">
      {badge}
      {showRetry && (sync.status === 'error' || sync.status === 'offline') && (
        <button type="button" onClick={() => void syncNow()} className="text-xs font-medium underline underline-offset-2">
          Retry
        </button>
      )}
    </span>
  )
}

export function SyncErrorBanner() {
  const { sync, syncNow } = useApp()
  if (sync.status !== 'error') return null
  return (
    <div className="mb-4 flex flex-col gap-2 rounded-xl border border-bad/40 bg-bad/10 px-4 py-3 text-sm sm:flex-row sm:items-center">
      <Icon name="alert" className="text-bad" />
      <p className="flex-1">
        <span className="font-medium">Sync failed.</span> {sync.message} Your changes are kept on this device.
      </p>
      <button type="button" onClick={() => void syncNow()} className="font-medium underline underline-offset-2">
        Retry now
      </button>
    </div>
  )
}
