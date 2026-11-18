import { describe, expect, it } from 'vitest'

import { umamiConfig, umamiScript, type UmamiConfig } from '@/lib/analytics/umami'

const WEBSITE = '5f0e2a3b-1c4d-4e8f-9a0b-1c2d3e4f5a6b'
const HOST = 'https://estadisticas.torrentearcano.com'

describe('umamiConfig', () => {
  it('con las dos variables, activo: la URL de Umami sin barra final y el ID de la web', () => {
    expect(umamiConfig({ UMAMI_HOST: `${HOST}/`, UMAMI_WEBSITE_ID: ` ${WEBSITE} ` })).toEqual({
      host: HOST,
      websiteId: WEBSITE,
    })
  })

  it('acepta Umami bajo una ruta', () => {
    expect(
      umamiConfig({ UMAMI_HOST: 'https://ejemplo.com/umami/', UMAMI_WEBSITE_ID: WEBSITE }),
    ).toEqual({ host: 'https://ejemplo.com/umami', websiteId: WEBSITE })
  })

  it.each([
    ['sin ninguna', {}],
    ['sin la URL', { UMAMI_WEBSITE_ID: WEBSITE }],
    ['sin el ID', { UMAMI_HOST: HOST }],
    ['con la URL en blanco', { UMAMI_HOST: '  ', UMAMI_WEBSITE_ID: WEBSITE }],
    ['con el ID en blanco', { UMAMI_HOST: HOST, UMAMI_WEBSITE_ID: ' ' }],
  ])('apagado %s', (_, env) => {
    expect(umamiConfig(env)).toBeNull()
  })

  it.each([
    ['APP_ENV=dev', { APP_ENV: 'dev' }],
    ['el entorno dev de Railway', { RAILWAY_ENVIRONMENT_NAME: 'dev' }],
  ])('apagado en dev (%s) aunque tenga las dos variables', (_, env) => {
    expect(umamiConfig({ UMAMI_HOST: HOST, UMAMI_WEBSITE_ID: WEBSITE, ...env })).toBeNull()
  })

  it.each([
    ['no es una URL', 'estadisticas'],
    ['no es http ni https', 'javascript:alert(1)'],
    ['lleva usuario y clave', 'https://yo:clave@estadisticas.com'],
  ])('apagado si la URL %s', (_, host) => {
    expect(umamiConfig({ UMAMI_HOST: host, UMAMI_WEBSITE_ID: WEBSITE })).toBeNull()
  })

  it('apagado si el ID no es un UUID: nunca entra texto libre en el script', () => {
    expect(umamiConfig({ UMAMI_HOST: HOST, UMAMI_WEBSITE_ID: '</script><script>x' })).toBeNull()
  })
})

type Sent = {
  url: string
  init: RequestInit
  body: { type: string; payload: Record<string, unknown> }
}

// Ejecuta el script inline en un navegador falso: location, history, document y los
// temporizadores son nuestros, y fetch apunta lo que se envía.
function browser(
  config: UmamiConfig,
  start = 'https://torrentearcano.com/seis-pies-bajo-tierra',
  { offline = false } = {},
) {
  let current = new URL(start)
  const sent: Sent[] = []
  const listeners: Record<string, (() => void)[]> = {}
  const timers: (() => void)[] = []
  const document = { title: 'Seis pies bajo tierra', referrer: 'https://www.google.com/' }
  const location = {
    get href() {
      return current.href
    },
    get origin() {
      return current.origin
    },
    get hostname() {
      return current.hostname
    },
    get pathname() {
      return current.pathname
    },
  }
  const go = (url?: string | URL | null) => {
    if (url != null) current = new URL(url, current)
  }
  const history = {
    pushState: (_state: unknown, _unused: string, url?: string | URL | null) => go(url),
    replaceState: (_state: unknown, _unused: string, url?: string | URL | null) => go(url),
  }
  const window = {
    addEventListener: (type: string, listener: () => void) => {
      ;(listeners[type] ??= []).push(listener)
    },
  }
  const fetch = (url: string, init: RequestInit) => {
    sent.push({ url, init, body: JSON.parse(String(init.body)) })
    return offline
      ? Promise.reject(new TypeError('Failed to fetch'))
      : Promise.resolve(new Response())
  }
  const setTimeout = (callback: () => void) => {
    timers.push(callback)
  }
  const navigator = { language: 'es-ES' }
  const screen = { width: 412, height: 915 }

  new Function(
    'window',
    'document',
    'location',
    'history',
    'navigator',
    'screen',
    'fetch',
    'setTimeout',
    'addEventListener',
    umamiScript(config),
  )(
    window,
    document,
    location,
    history,
    navigator,
    screen,
    fetch,
    setTimeout,
    window.addEventListener,
  )

  const flush = () => timers.splice(0).forEach((callback) => callback())
  return {
    sent,
    document,
    history,
    flush,
    fire: (type: string) => (listeners[type] ?? []).forEach((listener) => listener()),
    go,
  }
}

const config = { host: HOST, websiteId: WEBSITE }

describe('umamiScript', () => {
  it('al cargar la página envía una visita a /api/send de Umami, sin cookies', () => {
    const page = browser(config)
    page.fire('load')
    page.flush()

    expect(page.sent).toHaveLength(1)
    const [visit] = page.sent
    expect(visit!.url).toBe(`${HOST}/api/send`)
    expect(visit!.init).toMatchObject({
      method: 'POST',
      keepalive: true,
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
    })
    expect(visit!.body).toEqual({
      type: 'event',
      payload: {
        website: WEBSITE,
        hostname: 'torrentearcano.com',
        language: 'es-ES',
        referrer: 'https://www.google.com/',
        screen: '412x915',
        title: 'Seis pies bajo tierra',
        url: '/seis-pies-bajo-tierra',
      },
    })
  })

  it('no envía nada antes de que la página termine de cargar', () => {
    const page = browser(config)
    page.flush()

    expect(page.sent).toHaveLength(0)
  })

  it('manda solo la ruta: ni la consulta ni el ancla', () => {
    const page = browser(config, 'https://torrentearcano.com/checklists?directo=1&q=yo#paso-3')
    page.fire('load')
    page.flush()

    expect(page.sent[0]!.body.payload.url).toBe('/checklists')
  })

  it('cuenta cada navegación del App Router con el título nuevo y la página anterior', () => {
    const page = browser(config)
    page.fire('load')
    page.flush()

    page.history.pushState({}, '', '/metalogros?filtro=x')
    page.document.title = 'Metalogros'
    page.flush()

    expect(page.sent).toHaveLength(2)
    expect(page.sent[1]!.body.payload).toMatchObject({
      url: '/metalogros',
      title: 'Metalogros',
      referrer: 'https://torrentearcano.com/seis-pies-bajo-tierra',
    })
  })

  it('no repite la visita si la ruta no cambia (replaceState de Next, otra consulta, un ancla)', () => {
    const page = browser(config)
    page.fire('load')
    page.flush()

    page.history.replaceState({ __NA: true }, '', '/seis-pies-bajo-tierra')
    page.history.pushState({}, '', '/seis-pies-bajo-tierra?x=1#paso')
    page.flush()

    expect(page.sent).toHaveLength(1)
  })

  it('cuenta la vuelta atrás del navegador (popstate)', () => {
    const page = browser(config)
    page.fire('load')
    page.flush()
    page.history.pushState({}, '', '/metalogros')
    page.flush()

    page.go('/seis-pies-bajo-tierra')
    page.fire('popstate')
    page.flush()

    expect(page.sent.map((visit) => visit.body.payload.url)).toEqual([
      '/seis-pies-bajo-tierra',
      '/metalogros',
      '/seis-pies-bajo-tierra',
    ])
  })

  it('una navegación antes de cargar no se pierde ni se cuenta dos veces', () => {
    const page = browser(config)
    page.history.pushState({}, '', '/metalogros')
    page.fire('load')
    page.flush()

    expect(page.sent.map((visit) => visit.body.payload.url)).toEqual(['/metalogros'])
  })

  it('un fallo de red no rompe la página ni deja una promesa rechazada sin atender', async () => {
    const page = browser(config, undefined, { offline: true })
    page.fire('load')
    page.flush()
    // Una promesa rechazada sin catch haría fallar la ejecución de Vitest.
    await new Promise((resolve) => setImmediate(resolve))

    expect(page.sent).toHaveLength(1)
  })

  it('la configuración entra como JSON sin «<», que no puede cerrar el <script>', () => {
    const script = umamiScript({ host: 'https://a.com/<x>', websiteId: WEBSITE })
    expect(script).not.toContain('<')
    expect(script).toContain('\\u003cx>')
  })

  it('pesa menos de 1 KB sin comprimir', () => {
    expect(umamiScript(config).length).toBeLessThan(1024)
  })
})
