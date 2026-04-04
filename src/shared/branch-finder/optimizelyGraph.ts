import type { Branch } from './types'
import { requestGraphQL } from '../optimizelyGraphClient'

type BranchPage = {
  Branch: {
    total: number
    items: Branch[]
  }
}

const BRANCHES_QUERY = `
  query Branches($limit: Int!, $skip: Int!) {
    Branch(limit: $limit, skip: $skip) {
      total
      items {
        _id
        _modified
        Name
        Street
        City
        Country
        CountryCode
        ZipCode
        Coordinates
        Phone
        Email
      }
    }
  }
`

export async function fetchAllBranches(): Promise<Branch[]> {
  const all: Branch[] = []
  // NOTE(optimizely-graph): API enforces a max `limit` of 100.
  const pageSize = 100
  let skip = 0
  let total = Number.POSITIVE_INFINITY

  // NOTE(branch-finder): We fetch in pages because Optimizely Graph uses
  // skip/limit. Total is 1,000 for this dataset, but we don't hardcode it.
  while (skip < total) {
    const res = await requestGraphQL<BranchPage>(BRANCHES_QUERY, {
      limit: pageSize,
      skip,
    })

    total = res.Branch.total
    all.push(...res.Branch.items)

    skip += pageSize
    if (res.Branch.items.length === 0) break
  }

  return all
}
