import { useEffect, useMemo, useState } from 'react'
import type { Branch } from '../types'
import { fetchAllBranches } from '../optimizelyGraph'
import { branchCache } from '../storage'

type Status = 'idle' | 'loading' | 'success' | 'error'

type State = {
  status: Status
  data: Branch[] | null
  error: Error | null
}

export function useBranches(): State {
  const [state, setState] = useState<State>({
    status: 'idle',
    data: null,
    error: null,
  })

  const cacheKey = useMemo(() => branchCache.key(), [])

  useEffect(() => {
    let isActive = true

    async function run() {
      try {
        const cached = branchCache.read(cacheKey)
        // NOTE(branch-finder): Fast path to a responsive UI. We still refresh
        // in the background so the list stays accurate over time.
        if (cached) setState({ status: 'success', data: cached, error: null })
        else setState({ status: 'loading', data: null, error: null })

        const fresh = await fetchAllBranches()
        branchCache.write(cacheKey, fresh)

        if (!isActive) return
        setState({ status: 'success', data: fresh, error: null })
      } catch (err) {
        if (!isActive) return
        const error = err instanceof Error ? err : new Error('Unknown error')
        setState({ status: 'error', data: null, error })
      }
    }

    run()

    return () => {
      isActive = false
    }
  }, [cacheKey])

  return state
}
