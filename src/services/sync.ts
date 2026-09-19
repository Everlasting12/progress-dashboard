import type { ActivityFile, DashboardsFile, DataFileName, PendingOp, SettingsFile, Snapshot } from '../types'
import { applyActivityOps, applyDashboardOps, applySettingsOps } from '../lib/ops'
import { asActivityFile, asDashboardsFile, asSettingsFile } from '../lib/validate'
import { emptySnapshot } from '../lib/defaults'
import { GitHubClient, GitHubError } from './github'

/*
 * Sync algorithm for one file:
 *   1. GET the latest file and its sha from GitHub
 *   2. replay this device's pending operations on top of it
 *   3. PUT the result with that sha
 *   4. if GitHub answers 409/422 (someone else committed in between),
 *      start again from step 1 — up to 4 attempts
 * Only after a successful PUT are those operations removed from the queue.
 */

export const FILE_NAMES: Record<DataFileName, string> = {
  dashboards: 'dashboards.json',
  activity: 'activity.json',
  settings: 'settings.json',
}

const parsers = {
  dashboards: asDashboardsFile,
  activity: asActivityFile,
  settings: asSettingsFile,
} satisfies Record<DataFileName, (raw: unknown) => unknown>

function applyFor(name: DataFileName, data: Snapshot[DataFileName], ops: PendingOp[]) {
  switch (name) {
    case 'dashboards':
      return applyDashboardOps(data as DashboardsFile, ops)
    case 'activity':
      return applyActivityOps(data as ActivityFile, ops)
    case 'settings':
      return applySettingsOps(data as SettingsFile, ops)
  }
}

async function readFile(gh: GitHubClient, name: DataFileName) {
  const remote = await gh.readJson<unknown>(FILE_NAMES[name])
  const data = remote.data === null ? null : (parsers[name](remote.data) as Snapshot[DataFileName])
  return { data, sha: remote.sha }
}

export interface PullResult {
  snapshot: Snapshot
  shas: Partial<Record<DataFileName, string>>
  /** Files that don't exist in the repo yet. */
  missing: DataFileName[]
}

export async function pullAll(gh: GitHubClient): Promise<PullResult> {
  const names: DataFileName[] = ['dashboards', 'activity', 'settings']
  const results = await Promise.all(names.map((n) => readFile(gh, n)))
  const empty = emptySnapshot()
  const snapshot = { ...empty } as Snapshot
  const shas: PullResult['shas'] = {}
  const missing: DataFileName[] = []
  names.forEach((n, i) => {
    const r = results[i]!
    if (r.data) (snapshot as unknown as Record<DataFileName, unknown>)[n] = r.data
    else missing.push(n)
    if (r.sha) shas[n] = r.sha
  })
  return { snapshot, shas, missing }
}

export async function pushFile(
  gh: GitHubClient,
  name: DataFileName,
  ops: PendingOp[],
  fallback: Snapshot[DataFileName],
): Promise<{ data: Snapshot[DataFileName]; sha: string }> {
  const message = `data: update ${FILE_NAMES[name]} (${ops.length} change${ops.length === 1 ? '' : 's'}) [skip ci]`
  let lastError: unknown
  for (let attempt = 0; attempt < 4; attempt++) {
    const remote = await readFile(gh, name)
    const base = remote.data ?? fallback
    const next = applyFor(name, base, ops)
    try {
      const sha = await gh.writeJson(FILE_NAMES[name], next, remote.sha, message)
      return { data: next, sha }
    } catch (e) {
      lastError = e
      if (e instanceof GitHubError && e.isConflict) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
        continue
      }
      throw e
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Sync failed after several retries.')
}
