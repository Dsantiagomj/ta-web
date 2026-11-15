import type { ValuesSource } from '@/lib/achievements/dofusdb-values'

/** El campo del formulario que enlaza el dato de DofusDB. */
export const LINK: Record<ValuesSource, string> = { achievement: 'achievement', group: 'category' }

// El panel lee los valores por la API REST: aquí corre en el navegador. Una petición por
// documento de DofusDB mientras la página siga abierta; si falla, se reintenta.
const requests = new Map<string, Promise<unknown | null>>()

export function fetchValues(url: string): Promise<unknown | null> {
  const cached = requests.get(url)
  if (cached) return cached
  const request = fetch(url, { credentials: 'include' })
    .then((response) => (response.ok ? (response.json() as Promise<unknown>) : null))
    .catch(() => null)
    .then((values) => {
      if (!values) requests.delete(url)
      return values
    })
  requests.set(url, request)
  return request
}
