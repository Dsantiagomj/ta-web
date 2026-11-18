// Baja las páginas de la web de Torre con calma: de una en una, con una pausa entre ellas, y
// reintentando lo que Squarespace corta (el 2026-11-18 cortó 45 de 1 798 peticiones). Sigue
// una redirección dentro del sitio, como el rastreo del inventario (fetch_pages.py), y guarda
// el cuerpo de la página final. La red y la espera se inyectan para probar sin ellas.
import { SITE } from './pages.ts'

export interface FetchedPage {
  /** La primera respuesta (301, 307…), la de la página final y adónde redirigió. */
  status: number
  finalStatus: number
  redirects: string[]
  html: string
}

export interface CrawlOptions {
  fetchFn?: typeof fetch
  sleep?: (ms: number) => Promise<void>
  /** Reintentos tras un corte, un 429 o un 5xx: a los 2, 4 y 8 s. */
  retries?: number
}

export const USER_AGENT = 'Mozilla/5.0 (compatible; ta-web-inventario)'

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

interface Response1 {
  status: number
  location: string | null
  html: string
}

async function request(url: string, options: CrawlOptions): Promise<Response1> {
  const fetchFn = options.fetchFn ?? fetch
  const sleep = options.sleep ?? wait
  const retries = options.retries ?? 3
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (attempt > 0) await sleep(2 ** attempt * 1000)
    try {
      const response = await fetchFn(url, {
        headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'es-ES,es;q=0.9' },
        redirect: 'manual',
        signal: AbortSignal.timeout(30_000),
      })
      if ((response.status === 429 || response.status >= 500) && attempt < retries) {
        lastError = new Error(`HTTP ${response.status}`)
        continue
      }
      const redirect = response.status >= 300 && response.status < 400
      return {
        status: response.status,
        location: redirect ? response.headers.get('location') : null,
        html: redirect ? '' : await response.text(),
      }
    } catch (error) {
      lastError = error
    }
  }
  throw new Error(`${url}: ${lastError instanceof Error ? lastError.message : String(lastError)}`)
}

/** Una ruta del sitio, siguiendo una redirección que se quede en él. */
export async function fetchPage(
  pathname: string,
  options: CrawlOptions = {},
): Promise<FetchedPage> {
  const first = await request(SITE + pathname, options)
  if (!first.location) {
    return { status: first.status, finalStatus: first.status, redirects: [], html: first.html }
  }
  const target = new URL(first.location, SITE)
  if (target.origin !== SITE) {
    return {
      status: first.status,
      finalStatus: first.status,
      redirects: [first.location],
      html: '',
    }
  }
  await (options.sleep ?? wait)(1000)
  const final = await request(target.href, options)
  return {
    status: first.status,
    finalStatus: final.status,
    redirects: [first.location, ...(final.location ? [final.location] : [])],
    html: final.html,
  }
}
