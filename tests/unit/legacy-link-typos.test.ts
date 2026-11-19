import { describe, expect, it } from 'vitest'

import { BLOCKERS } from '../../scripts/legacy-links/blockers'
import { reportLines, type LegacyLinkEntry } from '../../scripts/legacy-links/report'
import { typoTarget, withTypoTarget } from '../../scripts/legacy-links/typos'

// Un enlace de Torre sin dueño que es una errata del slug de una página que sí existe: el
// informe dice cuál quería, para corregirlo en el panel.

const served = [
  'operacion-envenenamiento',
  'una-dendatura-para-el-bueno-de-mak',
  'un-asesino-en-bonta',
  'se-busca-darma',
  'se-busca-karma',
]

describe('typoTarget', () => {
  it('encuentra la página de una errata de una letra', () => {
    expect(typoTarget('una-dentatura-para-el-bueno-de-mak', served)).toBe(
      'una-dendatura-para-el-bueno-de-mak',
    )
  })

  it('encuentra la página aunque cambie el final de una palabra', () => {
    expect(typoTarget('operacion-envenenacion', served)).toBe('operacion-envenenamiento')
  })

  it('no inventa: otra cantidad de palabras o demasiado lejos no es una errata', () => {
    expect(typoTarget('operacion', served)).toBeNull()
    expect(typoTarget('operacion-rescate', served)).toBeNull()
    expect(typoTarget('frambuesa', served)).toBeNull()
  })

  it('si dos páginas están igual de cerca, no elige ninguna', () => {
    expect(typoTarget('se-busca-parma', served)).toBeNull()
  })

  it('un slug que la página ya tiene no es una errata', () => {
    expect(typoTarget('un-asesino-en-bonta', served)).toBeNull()
  })
})

const entry = (href: string, blocker: LegacyLinkEntry['blocker']): LegacyLinkEntry => ({
  source: 'content',
  where: 'Logro «Galones son amores» (/galones-son-amores), intro',
  href,
  served: null,
  blocker,
})

describe('withTypoTarget', () => {
  it('lo sin decidir con errata pasa a Torre, con la página que quería', () => {
    expect(withTypoTarget(entry('/operacion-envenenacion', 'undecided'), served)).toEqual({
      ...entry('/operacion-envenenacion', 'typo'),
      note: 'quería /operacion-envenenamiento',
    })
  })

  it('un enlace absoluto a Squarespace con errata también', () => {
    const href = 'https://www.torrentearcano.com/una-dentatura-para-el-bueno-de-mak/'
    expect(withTypoTarget(entry(href, 'undecided'), served).note).toBe(
      'quería /una-dendatura-para-el-bueno-de-mak',
    )
  })

  it('lo que ya tiene dueño o no se parece a nada queda igual', () => {
    const known = entry('/operacion-envenenacion', 'S-05')
    expect(withTypoTarget(known, served)).toBe(known)
    const unknown = entry('/algo-nuevo', 'undecided')
    expect(withTypoTarget(unknown, served)).toBe(unknown)
  })

  it('el informe las agrupa aparte, con la página que quería', () => {
    const lines = reportLines(
      [withTypoTarget(entry('/operacion-envenenacion', 'undecided'), served)],
      {
        relative: { page: 0, redirect: 0, route: 0 },
      },
    )
    expect(lines).toContain(`${BLOCKERS.typo.es} (1)`)
    expect(lines.join('\n')).toContain(
      '→ /operacion-envenenacion · del contenido · 404 tras el cambio · quería /operacion-envenenamiento',
    )
  })
})
