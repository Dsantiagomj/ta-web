import { describe, expect, it } from 'vitest'

import { modeScript } from '@/lib/theme/mode-script'

type Page = {
  cookie: string
  stored: string | null
  storedTheme?: string | null
  storageThrows?: boolean
}

// Ejecuta el script inline con un document y un localStorage falsos. El servidor ya pintó
// Amakna oscuro.
function run(page: Page) {
  const attributes: Record<string, string> = { 'data-mode': 'dark', 'data-theme': 'amakna' }
  const document = {
    cookie: page.cookie,
    documentElement: {
      setAttribute: (name: string, value: string) => {
        attributes[name] = value
      },
    },
  }
  const localStorage = {
    getItem: (key: string) => {
      if (page.storageThrows) throw new Error('SecurityError')
      if (key === 'ta-mode') return page.stored
      if (key === 'ta-theme') return page.storedTheme ?? null
      return null
    },
  }
  // Un document.cookie de verdad suma cada cookie escrita a las que ya había.
  const jar = { value: page.cookie }
  Object.defineProperty(document, 'cookie', {
    get: () => jar.value,
    set: (cookie: string) => {
      const pair = cookie.split(';')[0]
      jar.value = jar.value ? `${jar.value}; ${pair}` : pair
    },
  })
  new Function('document', 'localStorage', modeScript)(document, localStorage)
  return {
    mode: attributes['data-mode'],
    theme: attributes['data-theme'],
    cookie: document.cookie,
    js: attributes['data-js'],
  }
}

describe('modeScript', () => {
  it('marca que hay JavaScript antes del primer pintado (data-js), para la bolsa de la guía', () => {
    expect(run({ cookie: '', stored: null }).js).toBe('')
  })

  it('respeta la cookie, que es lo que ya pintó el servidor', () => {
    expect(run({ cookie: 'ta-mode=light', stored: 'dark' }).mode).toBe('light')
  })

  it('recupera el modo de localStorage si no hay cookie y la vuelve a escribir', () => {
    const result = run({ cookie: '', stored: 'light' })
    expect(result.mode).toBe('light')
    expect(result.cookie).toContain('ta-mode=light')
  })

  it('usa oscuro sin cookie ni localStorage', () => {
    expect(run({ cookie: '', stored: null }).mode).toBe('dark')
  })

  it('ignora valores desconocidos', () => {
    expect(run({ cookie: 'ta-mode=sepia', stored: 'rosa' }).mode).toBe('dark')
  })

  it('no rompe la página si localStorage lanza (modo privado estricto)', () => {
    expect(run({ cookie: '', stored: 'light', storageThrows: true }).mode).toBe('dark')
  })

  describe('el tema', () => {
    it('respeta la cookie de un tema gratis', () => {
      expect(run({ cookie: 'ta-theme=bonta', stored: null, storedTheme: 'arcano' }).theme).toBe(
        'bonta',
      )
    })

    it('recupera el tema de localStorage si no hay cookie y la vuelve a escribir', () => {
      const result = run({ cookie: 'ta-mode=dark', stored: null, storedTheme: 'brakmar' })
      expect(result.theme).toBe('brakmar')
      expect(result.cookie).toContain('ta-theme=brakmar')
    })

    it('deja Amakna sin cookie ni localStorage', () => {
      expect(run({ cookie: '', stored: null }).theme).toBe('amakna')
    })

    it('nunca pone el Ocre ni un tema desconocido: se queda el del servidor', () => {
      expect(run({ cookie: 'ta-theme=ocre', stored: null, storedTheme: 'ocre' }).theme).toBe(
        'amakna',
      )
      expect(run({ cookie: '', stored: null, storedTheme: 'frigost' }).theme).toBe('amakna')
      expect(run({ cookie: 'ta-theme=arcanox', stored: null }).theme).toBe('amakna')
    })

    it('no rompe la página si localStorage lanza', () => {
      const result = run({ cookie: '', stored: null, storedTheme: 'bonta', storageThrows: true })
      expect(result.theme).toBe('amakna')
    })
  })
})
