import type { DateKey, StreakRun, StreakStats } from '../types'
import { addDays, diffDays } from './date'

/*
 * Streak rules (documented in the README too):
 *
 *  - A streak ("run") is a maximal sequence of consecutive calendar days on
 *    which the dashboard was active. Any inactive day ends the run. Days after
 *    `today` are ignored.
 *
 *  - CURRENT streak: the length of the run whose last day is today. With a
 *    grace period of G days, a run that ended up to G days ago still counts
 *    as current (so, with G = 1, you have until the end of today to keep
 *    yesterday's streak alive). If no run qualifies, current = 0. Grace days
 *    never add to the length and never join two separate runs.
 *
 *  - LONGEST streak: the longest run in the whole history, including the
 *    current one.
 *
 *  - SHORTEST streak: the shortest *completed* run. The ongoing current run is
 *    excluded because it may still grow. null until at least one run ends.
 */
export function computeRuns(activeDates: Iterable<DateKey>, today: DateKey): StreakRun[] {
  const sorted = [...new Set(activeDates)].filter((d) => d <= today).sort()
  const runs: StreakRun[] = []
  for (const date of sorted) {
    const last = runs[runs.length - 1]
    if (last && addDays(last.end, 1) === date) {
      last.end = date
      last.length += 1
    } else {
      runs.push({ start: date, end: date, length: 1 })
    }
  }
  return runs
}

export function computeStreaks(activeDates: Iterable<DateKey>, today: DateKey, graceDays = 0): StreakStats {
  const runs = computeRuns(activeDates, today)
  const last = runs[runs.length - 1]
  const grace = Math.max(0, Math.floor(graceDays))
  const lastIsCurrent = !!last && diffDays(today, last.end) <= grace

  const completed = lastIsCurrent ? runs.slice(0, -1) : runs
  return {
    current: lastIsCurrent && last ? last.length : 0,
    longest: runs.reduce((m, r) => Math.max(m, r.length), 0),
    shortest: completed.length ? Math.min(...completed.map((r) => r.length)) : null,
    runs,
    activeDays: runs.reduce((s, r) => s + r.length, 0),
  }
}
