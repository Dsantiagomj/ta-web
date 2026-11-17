import type { Locator } from '@playwright/test'

// Las líneas que el navegador pinta de un texto partido, tal como se ven: cada carácter cae
// en la línea de su recuadro. Sirve para comprobar que una línea partida de cifras
// («Misión de Astrub - Nivel 20 -» / «Misión 2 de 3») nunca empieza por el separador.

/** El texto de cada línea visible del elemento, sin los espacios de los bordes. */
export function visualLines(locator: Locator): Promise<string[]> {
  return locator.evaluate((element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
    const lines: { top: number; text: string }[] = []
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node as Text
      for (let at = 0; at < text.data.length; at += 1) {
        const range = document.createRange()
        range.setStart(text, at)
        range.setEnd(text, at + 1)
        const rect = [...range.getClientRects()].find((box) => box.width > 0)
        if (!rect) continue
        const last = lines.at(-1)
        // Una línea nueva cuando el carácter baja más de media línea.
        if (!last || rect.top > last.top + rect.height / 2) {
          lines.push({ top: rect.top, text: text.data[at]! })
        } else {
          last.text += text.data[at]
        }
      }
    }
    return lines.map((line) => line.text.trim())
  })
}
