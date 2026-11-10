// Cliente mínimo de la API pública de DofusDB (https://api.dofusdb.fr), una API Feathers
// que pagina con $limit y $skip. El fetch y la pausa se inyectan para que las pruebas
// nunca salgan a la red.

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>

export interface DofusDbClientOptions {
  fetch?: FetchLike
  sleep?: (ms: number) => Promise<void>
  baseUrl?: string
  /** Una línea por reintento; por defecto, nada. */
  log?: (message: string) => void
  /** El azar de las esperas entre reintentos, entre 0 y 1. */
  random?: () => number
}

export interface FetchAllOptions {
  /** Solo estos campos de cada fila ($select de Feathers); sin él, la fila entera. */
  select?: string[]
}

export interface DofusDbClient {
  /** Todas las filas de una colección, página a página hasta el total. */
  fetchAll<T>(collection: string, options?: FetchAllOptions): Promise<T[]>
  /** Las filas con esos IDs; las que no existen simplemente no vuelven. */
  fetchByIds<T>(collection: string, ids: number[]): Promise<T[]>
  /**
   * La primera página (50 filas) de las que cumplen la consulta de Feathers, como
   * { 'name.es': 'Pepita' }. Para buscar, no para recorrer una colección.
   */
  fetchWhere<T>(
    collection: string,
    query: Record<string, string | number>,
    options?: FetchAllOptions,
  ): Promise<T[]>
}

interface Page<T> {
  total: number
  data: T[]
}

// DofusDB nunca devuelve más de 50 filas por petición, pida lo que se pida.
const PAGE_SIZE = 50
// 40 IDs por petición mantienen la URL corta y caben en una sola página de 50.
const IDS_PER_REQUEST = 40
// Una pausa breve entre peticiones para no cargar una API gratuita.
const DELAY_MS = 50
const USER_AGENT = 'ta-web/datos-del-juego'
// Los fallos de red y los 429, 502, 503 y 504 suelen pasar solos: se reintentan hasta 4
// veces, esperando 0,5, 1, 2 y 4 s más hasta un 25 % al azar.
const RETRIES = 4
const FIRST_RETRY_MS = 500
const RETRY_STATUSES = new Set([429, 502, 503, 504])
// Un Retry-After desmesurado no deja el script parado.
const MAX_RETRY_AFTER_MS = 60_000
// Sin límite, una conexión colgada esperaría minutos antes de fallar.
const TIMEOUT_MS = 30_000

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Retry-After en segundos o como fecha HTTP; null si falta o no se entiende. */
function retryAfterMs(response: Response): number | null {
  const header = response.headers.get('retry-after')?.trim()
  if (!header) return null
  const ms = /^\d+$/.test(header) ? Number(header) * 1000 : Date.parse(header) - Date.now()
  if (Number.isNaN(ms)) return null
  return Math.min(Math.max(ms, 0), MAX_RETRY_AFTER_MS)
}

type Attempt =
  | { kind: 'body'; body: string }
  | { kind: 'status'; response: Response }
  | { kind: 'network'; error: unknown }

function attempts(count: number): string {
  return count === 1 ? '1 intento' : `${count} intentos`
}

function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error)
  const cause = error.cause instanceof Error ? ` (${error.cause.message})` : ''
  return `${error.message}${cause}`
}

export function createDofusDbClient(options: DofusDbClientOptions = {}): DofusDbClient {
  const fetch = options.fetch ?? globalThis.fetch
  const sleep = options.sleep ?? wait
  const baseUrl = options.baseUrl ?? 'https://api.dofusdb.fr'
  const log = options.log ?? (() => {})
  const random = options.random ?? Math.random

  // Una petición sin reintentos: el cuerpo si fue bien, la respuesta si DofusDB respondió
  // otra cosa, o el error si la red falló. El cuerpo también llega por la red.
  async function request(url: string): Promise<Attempt> {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (!response.ok) return { kind: 'status', response }
      return { kind: 'body', body: await response.text() }
    } catch (error) {
      return { kind: 'network', error }
    }
  }

  async function get<T>(path: string): Promise<Page<T>> {
    const url = `${baseUrl}/${path}`
    for (let attempt = 1; ; attempt += 1) {
      const result = await request(url)
      if (result.kind === 'body') return JSON.parse(result.body) as Page<T>

      const last = attempt > RETRIES
      let delay = FIRST_RETRY_MS * 2 ** (attempt - 1) * (1 + random() * 0.25)
      let failure: string
      if (result.kind === 'status') {
        const { status, statusText } = result.response
        failure = `respondió ${status} ${statusText}`
        if (last || !RETRY_STATUSES.has(status)) {
          throw new Error(`DofusDB ${failure} en ${url} tras ${attempts(attempt)}`)
        }
        if (status === 429) delay = retryAfterMs(result.response) ?? delay
      } else {
        failure = `no respondió (${describeError(result.error)})`
        if (last) {
          throw new Error(
            `DofusDB no respondió en ${url} tras ${attempts(attempt)}: ${describeError(result.error)}`,
            { cause: result.error },
          )
        }
      }
      const seconds = (delay / 1000).toFixed(1)
      log(`DofusDB ${failure} en ${url}; reintento ${attempt} de ${RETRIES} en ${seconds} s`)
      await sleep(delay)
    }
  }

  return {
    async fetchAll<T>(collection: string, options: FetchAllOptions = {}) {
      const select = (options.select ?? []).map((field) => `&$select[]=${field}`).join('')
      const rows: T[] = []
      for (let skip = 0; ; skip += PAGE_SIZE) {
        const page = await get<T>(`${collection}?$limit=${PAGE_SIZE}&$skip=${skip}${select}`)
        rows.push(...page.data)
        // Una página vacía corta el bucle aunque el total diga otra cosa.
        if (page.data.length === 0 || skip + PAGE_SIZE >= page.total) return rows
        await sleep(DELAY_MS)
      }
    },

    async fetchWhere<T>(
      collection: string,
      query: Record<string, string | number>,
      options: FetchAllOptions = {},
    ) {
      const where = Object.entries(query)
        .map(([key, value]) => `&${key}=${encodeURIComponent(String(value))}`)
        .join('')
      const select = (options.select ?? []).map((field) => `&$select[]=${field}`).join('')
      return (await get<T>(`${collection}?$limit=${PAGE_SIZE}${where}${select}`)).data
    },

    async fetchByIds<T>(collection: string, ids: number[]) {
      const unique = [...new Set(ids)]
      const rows: T[] = []
      for (let start = 0; start < unique.length; start += IDS_PER_REQUEST) {
        if (start > 0) await sleep(DELAY_MS)
        const chunk = unique.slice(start, start + IDS_PER_REQUEST)
        const filter = chunk.map((id) => `id[$in][]=${id}`).join('&')
        const page = await get<T>(`${collection}?$limit=${PAGE_SIZE}&${filter}`)
        rows.push(...page.data)
      }
      return rows
    },
  }
}
