// Cliente mínimo de la API pública de DofusDB (https://api.dofusdb.fr), una API Feathers
// que pagina con $limit y $skip. El fetch y la pausa se inyectan para que las pruebas
// nunca salgan a la red.

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>

export interface DofusDbClientOptions {
  fetch?: FetchLike
  sleep?: (ms: number) => Promise<void>
  baseUrl?: string
}

export interface DofusDbClient {
  /** Todas las filas de una colección, página a página hasta el total. */
  fetchAll<T>(collection: string): Promise<T[]>
  /** Las filas con esos IDs; las que no existen simplemente no vuelven. */
  fetchByIds<T>(collection: string, ids: number[]): Promise<T[]>
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

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export function createDofusDbClient(options: DofusDbClientOptions = {}): DofusDbClient {
  const fetch = options.fetch ?? globalThis.fetch
  const sleep = options.sleep ?? wait
  const baseUrl = options.baseUrl ?? 'https://api.dofusdb.fr'

  async function get<T>(path: string): Promise<Page<T>> {
    const url = `${baseUrl}/${path}`
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    })
    if (!response.ok) {
      throw new Error(`DofusDB respondió ${response.status} ${response.statusText} en ${url}`)
    }
    return (await response.json()) as Page<T>
  }

  return {
    async fetchAll<T>(collection: string) {
      const rows: T[] = []
      for (let skip = 0; ; skip += PAGE_SIZE) {
        const page = await get<T>(`${collection}?$limit=${PAGE_SIZE}&$skip=${skip}`)
        rows.push(...page.data)
        // Una página vacía corta el bucle aunque el total diga otra cosa.
        if (page.data.length === 0 || skip + PAGE_SIZE >= page.total) return rows
        await sleep(DELAY_MS)
      }
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
