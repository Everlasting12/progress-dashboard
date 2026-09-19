import type { GitHubConfig } from '../types'

/*
 * Thin wrapper around the GitHub REST "contents" API.
 * https://docs.github.com/en/rest/repos/contents
 */

const API = 'https://api.github.com'

export class GitHubError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'GitHubError'
  }
  /** The file changed on GitHub since we read it. */
  get isConflict() {
    return this.status === 409 || (this.status === 422 && /sha/i.test(this.message))
  }
}

export interface RemoteFile<T> {
  data: T | null
  sha: string | undefined
}

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

function fromBase64(b64: string): string {
  const bin = atob(b64.replace(/\n/g, ''))
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function explain(status: number, apiMessage: string, cfg: GitHubConfig): string {
  switch (status) {
    case 401:
      return 'GitHub rejected the token. It may be expired or mistyped — create a new one and paste it in Settings.'
    case 403:
      if (/rate limit/i.test(apiMessage)) return 'GitHub API rate limit reached. Wait a few minutes and retry.'
      return `The token can't write to ${cfg.owner}/${cfg.repo}. Give it "Contents: Read and write" access to this repository.`
    case 404:
      return `Couldn't find ${cfg.owner}/${cfg.repo} (branch "${cfg.branch}"). Check the owner, repository and branch, and that the token has access to this repository.`
    case 409:
    case 422:
      return 'The file changed on GitHub while saving. Retrying with the latest version.'
    default:
      return apiMessage || `GitHub returned status ${status}.`
  }
}

export class GitHubClient {
  private cfg: GitHubConfig

  constructor(cfg: GitHubConfig) {
    this.cfg = cfg
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let res: Response
    try {
      res = await fetch(`${API}${path}`, {
        ...init,
        cache: 'no-store',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${this.cfg.token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          ...init.headers,
        },
      })
    } catch {
      throw new GitHubError(0, 'Could not reach GitHub. Check your internet connection.')
    }
    if (!res.ok) {
      let msg = ''
      try {
        msg = ((await res.json()) as { message?: string }).message ?? ''
      } catch {
        /* empty body */
      }
      throw new GitHubError(res.status, explain(res.status, msg, this.cfg))
    }
    return (await res.json()) as T
  }

  private filePath(name: string) {
    const dir = this.cfg.dataPath.replace(/^\/+|\/+$/g, '')
    const full = dir ? `${dir}/${name}` : name
    return full.split('/').map(encodeURIComponent).join('/')
  }

  private repoPath() {
    return `/repos/${encodeURIComponent(this.cfg.owner)}/${encodeURIComponent(this.cfg.repo)}`
  }

  /** Read a JSON file. Returns data = null if the file doesn't exist yet. */
  async readJson<T>(name: string): Promise<RemoteFile<T>> {
    try {
      const file = await this.request<{ content: string; sha: string; size: number; encoding: string }>(
        `${this.repoPath()}/contents/${this.filePath(name)}?ref=${encodeURIComponent(this.cfg.branch)}`,
      )
      let text: string
      if (file.content && file.encoding === 'base64') {
        text = fromBase64(file.content)
      } else {
        // Files over 1 MB come back without inline content; fetch the blob instead.
        const blob = await this.request<{ content: string }>(`${this.repoPath()}/git/blobs/${file.sha}`)
        text = fromBase64(blob.content)
      }
      try {
        return { data: JSON.parse(text) as T, sha: file.sha }
      } catch {
        throw new GitHubError(422, `${name} on GitHub is not valid JSON. Fix or delete the file in the repository.`)
      }
    } catch (e) {
      if (e instanceof GitHubError && e.status === 404) {
        // Distinguish "file missing" from "repo/branch missing".
        await this.request(`${this.repoPath()}/branches/${encodeURIComponent(this.cfg.branch)}`)
        return { data: null, sha: undefined }
      }
      throw e
    }
  }

  /** Create or update a JSON file. `sha` must be the current blob sha when updating. */
  async writeJson(name: string, data: unknown, sha: string | undefined, message: string): Promise<string> {
    const res = await this.request<{ content: { sha: string } }>(
      `${this.repoPath()}/contents/${this.filePath(name)}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          message,
          content: toBase64(JSON.stringify(data, null, 2) + '\n'),
          branch: this.cfg.branch,
          ...(sha ? { sha } : {}),
        }),
      },
    )
    return res.content.sha
  }

  /** Checks the token, repository access, write permission and branch. */
  async testConnection(): Promise<string[]> {
    const lines: string[] = []
    const repo = await this.request<{ full_name: string; private: boolean; permissions?: { push?: boolean } }>(this.repoPath())
    lines.push(`Repository ${repo.full_name} found (${repo.private ? 'private' : 'public'}).`)
    if (repo.permissions && !repo.permissions.push) {
      throw new GitHubError(403, 'The token can read this repository but cannot write to it. Grant "Contents: Read and write".')
    }
    lines.push('Token has write access.')
    await this.request(`${this.repoPath()}/branches/${encodeURIComponent(this.cfg.branch)}`)
    lines.push(`Branch "${this.cfg.branch}" exists.`)
    return lines
  }
}

export function isConfigured(cfg: GitHubConfig | null): cfg is GitHubConfig {
  return !!cfg && !!cfg.owner && !!cfg.repo && !!cfg.branch && !!cfg.token
}
