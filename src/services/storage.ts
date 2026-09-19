import type { GitHubConfig, PendingOp, Snapshot } from '../types'
import { STORAGE_KEYS } from '../lib/constants'

/*
 * Browser-local persistence. Three keys:
 *  - pd:github   connection settings incl. the token (never leaves this browser
 *                except in the Authorization header to api.github.com)
 *  - pd:cache    last copy of the data read from / written to GitHub
 *  - pd:pending  edits not yet committed to GitHub
 */

export interface CacheState {
  snapshot: Snapshot
  shas: Partial<Record<keyof Snapshot, string>>
  lastSyncedAt: string | null
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error('Could not write to localStorage', e)
  }
}

export const storage = {
  loadGitHub: () => read<GitHubConfig>(STORAGE_KEYS.github),
  saveGitHub: (cfg: GitHubConfig) => write(STORAGE_KEYS.github, cfg),
  clearGitHub: () => localStorage.removeItem(STORAGE_KEYS.github),

  loadCache: () => read<CacheState>(STORAGE_KEYS.cache),
  saveCache: (c: CacheState) => write(STORAGE_KEYS.cache, c),

  loadPending: () => read<PendingOp[]>(STORAGE_KEYS.pending) ?? [],
  savePending: (ops: PendingOp[]) => write(STORAGE_KEYS.pending, ops),
}
