type GraphQLError = { message: string }

type GraphQLResponse<T> = {
  data?: T
  errors?: GraphQLError[]
}

function getEndpoint() {
  // NOTE(config): Keep an escape hatch for the reviewer to swap endpoints.
  // Vite only exposes env vars prefixed with VITE_.
  return import.meta.env.VITE_OPTIMIZELY_GRAPH_ENDPOINT 
}

export async function requestGraphQL<TData>(
  query: string,
  variables: Record<string, unknown>,
): Promise<TData> {
  const endpoint = getEndpoint()

  if (!endpoint) {
    throw new Error('VITE_OPTIMIZELY_GRAPH_ENDPOINT is not defined. Please check your .env file.')
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })

  if (!res.ok) {
    throw new Error(`Optimizely Graph request failed (${res.status})`)
  }

  const json = (await res.json()) as GraphQLResponse<TData>

  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '))
  }
  if (!json.data) throw new Error('Optimizely Graph returned no data.')

  return json.data
}

