import { useMemo, useState } from 'react'
import type { BranchWithComputed } from '../types'
import { formatDistance, formatInlineAddress } from '../utils'
import { LoadingState } from './LoadingState'

type Status = 'idle' | 'loading' | 'success' | 'error'

type Props = {
  status: Status
  branches: BranchWithComputed[]
  error?: Error | null
  selectedBranchId: string | null
  onSelectBranch: (branch: BranchWithComputed) => void
}

const PAGE_SIZE = 5

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function getPageItems(currentPage: number, totalPages: number) {
  // NOTE(pagination): Keep the control compact while still allowing quick jumps.
  // Example for 40 pages: 1 … 12 13 [14] 15 16 … 40
  const out: Array<number | '…'> = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) out.push(i)
    return out
  }

  const windowStart = clamp(currentPage - 2, 2, totalPages - 5)
  const windowEnd = windowStart + 4

  out.push(1)
  if (windowStart > 2) out.push('…')
  for (let i = windowStart; i <= windowEnd; i++) out.push(i)
  if (windowEnd < totalPages - 1) out.push('…')
  out.push(totalPages)

  return out
}

export function BranchList(props: Props) {
  const { status, branches, error, selectedBranchId, onSelectBranch } = props
  const [pageIndex, setPageIndex] = useState(0) // 0-based

  const totalItems = branches.length
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
  const safePageIndex = Math.min(pageIndex, totalPages - 1)
  const currentPage = safePageIndex + 1 // 1-based

  const start = safePageIndex * PAGE_SIZE
  const end = Math.min(start + PAGE_SIZE, totalItems)

  const visible = useMemo(() => branches.slice(start, end), [branches, end, start])

  if (status === 'loading') {
    return <LoadingState label="Loading branches…" />
  }

  if (status === 'error') {
    return (
      <div className="bs-empty" role="status">
        <h3 className="bs-empty__title">We couldn’t load branches</h3>
        <p className="bs-empty__body">
          Please refresh the page or try again later.
        </p>
        {import.meta.env.DEV && error?.message && (
          <p className="bs-help bs-help--error">DEV: {error.message}</p>
        )}
      </div>
    )
  }

  if (branches.length === 0) {
    return (
      <div className="bs-empty" role="status">
        <h3 className="bs-empty__title">No matches</h3>
        <p className="bs-empty__body">
          Try a different search term or clear a filter.
        </p>
      </div>
    )
  }

  return (
    <div className="finderList" aria-label="Branch results">
      <ol className="finderList__items">
        {visible.map((b) => {
          const isSelected = b._id === selectedBranchId
          return (
            <li key={b._id}>
              <button
                type="button"
                className={isSelected ? 'card card--active' : 'card'}
                onClick={() => onSelectBranch(b)}
              >
                <div className="card__header">
                  <h3 className="card__title">{b.Name}</h3>
                  {b.distanceKm != null && (
                    <span className="card__meta">
                      {formatDistance(b.distanceKm)}
                    </span>
                  )}
                </div>
                <p className="card__body">{formatInlineAddress(b)}</p>
                <p className="card__sub">
                  {b.Phone ? b.Phone : 'Call us'} · {b.Email}
                </p>
              </button>
            </li>
          )
        })}
      </ol>

      <div className="pager" aria-label="Pagination">
        <div className="pager__meta">
          Showing <strong>{(start + 1).toLocaleString()}</strong>–
          <strong>{end.toLocaleString()}</strong> of{' '}
          <strong>{totalItems.toLocaleString()}</strong>
        </div>

        <div className="pager__controls">
          <nav className="pager__nav" aria-label="Branch pages">
            <button
              type="button"
              className="bs-btn bs-btn--secondary pager__btn"
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              disabled={safePageIndex === 0}
            >
              Previous
            </button>

            <div className="pager__pages" role="list">
              {getPageItems(currentPage, totalPages).map((item, i) => {
                if (item === '…') {
                  return (
                    // NOTE(pagination): non-interactive separator
                    <span key={`ellipsis-${i}`} className="pager__ellipsis">
                      …
                    </span>
                  )
                }

                const isCurrent = item === currentPage
                return (
                  <button
                    key={item}
                    type="button"
                    className={isCurrent ? 'pager__page pager__page--active' : 'pager__page'}
                    aria-current={isCurrent ? 'page' : undefined}
                    onClick={() => setPageIndex(item - 1)}
                  >
                    {item}
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              className="bs-btn bs-btn--secondary pager__btn"
              onClick={() =>
                setPageIndex((p) => Math.min(totalPages - 1, p + 1))
              }
              disabled={safePageIndex >= totalPages - 1}
            >
              Next
            </button>
          </nav>
        </div>
      </div>
    </div>
  )
}
