import type { Mode, Theme } from './theme'

// Los valores crudos (--t-*) de cada tema y modo, leídos del CSS de theme.css. Lo usan
// las imágenes que no pueden leer variables CSS, como el favicon (scripts/build-icons.ts).

export type PaletteKey = `${Theme}-${Mode}`
export type Palette = Record<PaletteKey, Record<string, string>>

export function readPalette(css: string): Palette {
  const palette: Record<string, Record<string, string>> = {}
  const blocks = css.matchAll(/\[data-theme='(\w+)'\]\[data-mode='(\w+)'\]\s*\{([^}]*)\}/g)
  for (const [, theme, mode, body] of blocks) {
    const values: Record<string, string> = {}
    for (const [, name, value] of body.matchAll(/--t-([\w-]+):\s*([^;]+);/g)) {
      values[name] = value.trim()
    }
    palette[`${theme}-${mode}`] = values
  }
  return palette as Palette
}
