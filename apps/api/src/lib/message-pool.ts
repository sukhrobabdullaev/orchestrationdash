export interface MessagePool {
  input: string
  [key: string]: unknown
}

export function createPool(input: string): MessagePool {
  return { input }
}

export function extendPool(pool: MessagePool, additions: Record<string, unknown>): MessagePool {
  return { ...pool, ...additions }
}
