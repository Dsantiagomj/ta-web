import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync('src/styles/theme.css', 'utf8')

// Los tokens semánticos que @theme inline apunta a los valores crudos de cada tema.
const semanticTokens = [...css.matchAll(/^\s*(--color-[\w-]+):\s*(var\(--t-[\w-]+\));/gm)].map(
  ([, token, value]) => ({ token, value }),
)

describe('theme.css en una sección con su propio tema', () => {
  it('lee los tokens semánticos del bloque @theme inline', () => {
    expect(semanticTokens.map(({ token }) => token)).toContain('--color-accent')
    expect(semanticTokens.length).toBeGreaterThanOrEqual(20)
  })

  it('vuelve a resolver cada token en un elemento con data-theme o data-mode', () => {
    // Una variable que apunta a otra se resuelve donde se declara (:root) y se hereda ya
    // resuelta: sin redeclararla, var(--color-accent) daría Arcano oscuro dentro de una
    // sección con data-theme="bonta".
    const block = /\[data-theme\],\s*\[data-mode\]\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''
    for (const { token, value } of semanticTokens) {
      expect(block, token).toContain(`${token}: ${value};`)
    }
    expect(block).toContain('--color-section: var(--t-accent);')
    expect(block).toMatch(/--shadow-art:/)
  })
})
