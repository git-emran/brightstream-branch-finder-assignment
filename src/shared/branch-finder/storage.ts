import type { Branch } from './types'

type CachePayload = {
  savedAt: number
  branches: Branch[]
}

const CACHE_TTL_MS = 1000 * 60 * 60 * 12 // 12 hours

export const branchCache = {
  key() {
    return 'brightstream.branchFinder.cache.v1'
  },
  read(key: string): Branch[] | null {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return null
      const parsed = JSON.parse(raw) as CachePayload
      if (!parsed?.savedAt || !Array.isArray(parsed.branches)) return null
      if (Date.now() - parsed.savedAt > CACHE_TTL_MS) return null
      return parsed.branches
    } catch {
      return null
    }
  },
  write(key: string, branches: Branch[]) {
    try {
      const payload: CachePayload = { savedAt: Date.now(), branches }
      localStorage.setItem(key, JSON.stringify(payload))
    } catch {
      // NOTE(branch-finder): Cache is best-effort; ignore quota errors.
    }
  },
}

