import { describe, expect, it } from 'vitest'

import { modeScript } from '@/lib/theme/mode-script'

type Page = {
  cookie: string
  stored: string | null
  storageThrows?: boolean
}

// Ejecuta el script inline con un document y un localStorage falsos.
function run(page: Page) {
  const attributes: Record<string, string> = { 'data-mode': 'dark' }
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
      return key === 'ta-mode' ? page.stored : null
    },
  }
  new Function('document', 'localStorage', modeScript)(document, localStorage)
  return { mode: attributes['data-mode'], cookie: document.cookie }
}

describe('modeScript', () => {
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

  it('no toca el tema: el tema lo decide solo el servidor', () => {
    expect(modeScript).not.toContain('data-theme')
  })
})
