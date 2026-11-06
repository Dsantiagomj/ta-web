import { describe, expect, it } from 'vitest'

import { parseHtml, releaseDom } from '../../scripts/import/squarespace/dom'

// happy-dom guarda cada documento que parsea en su ventana: con las 1272 páginas en una
// sola ventana el proceso se queda sin memoria. releaseDom cierra la ventana compartida y
// la siguiente lectura abre otra.
describe('releaseDom', () => {
  it('cierra la ventana compartida y la siguiente lectura usa otra', async () => {
    const before = parseHtml('<p>uno</p>')
    const window = before.defaultView
    await releaseDom()
    const after = parseHtml('<p>dos</p>')
    expect(after.defaultView).not.toBe(window)
    expect(after.body.textContent).toBe('dos')
  })

  it('sin ventana abierta no hace nada', async () => {
    await releaseDom()
    await expect(releaseDom()).resolves.toBeUndefined()
  })
})
