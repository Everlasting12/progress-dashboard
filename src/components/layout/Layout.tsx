import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Icon, type IconName } from '../ui/Icon'
import { SyncBadge } from '../SyncBadge'
import { useApp } from '../../store/AppStore'
import { useEntrySheet } from '../EntrySheet'

const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/dashboards', label: 'Dashboards', icon: 'grid' },
  { to: '/analytics', label: 'Analytics', icon: 'chart' },
  { to: '/history', label: 'History', icon: 'history' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
]

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="7" className="fill-ink" />
        <g className="fill-canvas">
          <rect x="6" y="18" width="5" height="5" rx="1.2" opacity=".45" />
          <rect x="13.5" y="12" width="5" height="11" rx="1.2" opacity=".7" />
          <rect x="21" y="7" width="5" height="16" rx="1.2" />
        </g>
      </svg>
      <span className="font-semibold tracking-tight">Progress</span>
    </div>
  )
}

export function Layout() {
  const { dashboards } = useApp()
  const openEntry = useEntrySheet()
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="min-h-full lg:grid lg:grid-cols-[240px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface/60 px-3 py-5 lg:flex">
        <div className="px-2"><Logo /></div>
        <button
          type="button"
          onClick={() => openEntry()}
          className="mx-1 mt-6 flex h-10 items-center justify-center gap-2 rounded-lg bg-ink text-sm font-medium text-canvas transition hover:opacity-90"
        >
          <Icon name="plus" size={16} /> Add today's progress
        </button>
        <nav className="mt-6 space-y-0.5">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm transition ${
                  isActive ? 'bg-raised font-medium text-ink' : 'text-muted hover:bg-raised/60 hover:text-ink'
                }`
              }
            >
              <Icon name={n.icon} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-6 px-2.5 text-xs font-medium text-faint">Your dashboards</div>
        <nav className="scroll-thin mt-1.5 flex-1 space-y-0.5 overflow-y-auto">
          {dashboards.map((d) => (
            <NavLink
              key={d.id}
              to={`/d/${d.id}`}
              className={({ isActive }) =>
                `flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-sm transition ${
                  isActive ? 'bg-raised font-medium text-ink' : 'text-muted hover:bg-raised/60 hover:text-ink'
                }`
              }
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: d.color }} />
              <span className="truncate">{d.name}</span>
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-line px-2.5 pt-3"><SyncBadge showRetry /></div>
      </aside>

      <div className="min-w-0">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-canvas/85 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur lg:hidden">
          <Logo />
          <SyncBadge />
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile: floating add button + bottom navigation */}
      <button
        type="button"
        onClick={() => openEntry()}
        aria-label="Add today's progress"
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-canvas shadow-lg transition active:scale-95 lg:hidden"
      >
        <Icon name="plus" size={24} />
      </button>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) =>
              `flex h-16 flex-col items-center justify-center gap-1 text-[11px] ${isActive ? 'text-ink' : 'text-faint'}`
            }
          >
            <Icon name={n.icon} size={20} />
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
