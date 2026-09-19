import type { StreakStats } from '../types'
import { useCountUp } from '../hooks/useCountUp'
import { Card } from './ui/Card'

function Big({ n }: { n: number }) {
  const v = useCountUp(n)
  return <span className="font-mono text-4xl font-bold tracking-tight tabular sm:text-5xl">{v}</span>
}

export function StreakCards({ streaks, color, compact = false }: { streaks: StreakStats; color: string; compact?: boolean }) {
  const current = streaks.current
  const alive = current > 0
  return (
    <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
      <Card
        className="relative col-span-2 overflow-hidden p-5 md:col-span-1"
        style={alive ? { borderColor: `${color}66`, background: `linear-gradient(160deg, ${color}1f, transparent 70%)` } : undefined}
      >
        <div className="flex items-center gap-2 text-sm text-muted">
          <span className={alive ? 'animate-flicker' : 'grayscale'} aria-hidden>🔥</span> Current streak
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <Big n={current} />
          <span className="text-muted">{current === 1 ? 'day' : 'days'}</span>
        </div>
        <p className="mt-1 text-xs text-muted">
          {alive ? (current >= streaks.longest && current > 1 ? 'Your best run yet' : 'Keep it going today') : 'Log activity today to start one'}
        </p>
      </Card>
      <Card className="p-5">
        <div className="flex items-center gap-2 text-sm text-muted"><span aria-hidden>🏆</span> Longest streak</div>
        <div className="mt-3 flex items-baseline gap-2">
          <Big n={streaks.longest} />
          <span className="text-muted">{streaks.longest === 1 ? 'day' : 'days'}</span>
        </div>
      </Card>
      {!compact && (
        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm text-muted"><span aria-hidden>📉</span> Shortest streak</div>
          <div className="mt-3 flex items-baseline gap-2">
            {streaks.shortest === null ? (
              <span className="font-mono text-4xl font-bold text-faint sm:text-5xl">–</span>
            ) : (
              <>
                <Big n={streaks.shortest} />
                <span className="text-muted">{streaks.shortest === 1 ? 'day' : 'days'}</span>
              </>
            )}
          </div>
          {streaks.shortest === null && <p className="mt-1 text-xs text-muted">Appears once a streak has ended</p>}
        </Card>
      )}
    </div>
  )
}

export function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3.5">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 font-mono text-xl font-bold tabular">{value}</div>
      {sub && <div className="mt-0.5 truncate text-xs text-faint">{sub}</div>}
    </div>
  )
}
