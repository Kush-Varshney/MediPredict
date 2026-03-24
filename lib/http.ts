export type FetchOptions = RequestInit & { timeoutMs?: number; retries?: number; retryDelayMs?: number }

export async function fetchWithTimeout(url: string, options: FetchOptions = {}) {
  const { timeoutMs = 20000, ...rest } = options
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...rest, signal: controller.signal })
    return res
  } finally {
    clearTimeout(id)
  }
}

export async function retryFetch(url: string, options: FetchOptions = {}) {
  const { retries = 2, retryDelayMs = 800, ...rest } = options
  let attempt = 0
  while (attempt <= retries) {
    try {
      const res = await fetchWithTimeout(url, rest)
      return res
    } catch (err) {
      if (attempt === retries) throw err
      await new Promise((r) => setTimeout(r, retryDelayMs * Math.pow(2, attempt)))
      attempt += 1
    }
  }
  // should never get here
  throw new Error("retryFetch exhausted")
}

export function parseJsonSafe<T = any>(res: Response): Promise<T | null> {
  return res
    .clone()
    .json()
    .catch(() => null)
}