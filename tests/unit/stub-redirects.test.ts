import { describe, expect, it } from 'vitest'

import {
  mapStubs,
  stubKeys,
  stubReport,
  stubsSection,
  type StubData,
} from '../../scripts/redirects/stub-map'
import { LEGACY_STUBS } from '../../scripts/redirects/stubs'

// Los esbozos vacíos de Squarespace (backlog B-04): 301 a su página de logro cuando un
// visitante puede abrirla, 410 si no. El mapa sale de los datos de DofusDB de ta-web: el
// esbozo es un logro, o una misión cuyo logro tiene página.

const data = (extra: Partial<StubData> = {}): StubData => ({
  achievements: [
    { id: 1, dofusId: 101, name: 'La larga marcha', quests: [{ name: 'Fuego de dios' }] },
    { id: 2, dofusId: 102, name: 'Formación práctica', quests: [] },
    { id: 3, dofusId: 103, name: 'Kolimira y Dragrillado', quests: [] },
    { id: 4, dofusId: 104, name: 'Sin página', quests: [] },
  ],
  quests: [
    { name: 'Corazón de piedra', achievement: { dofusId: 101 } },
    { name: 'Formación de primer año', achievement: { dofusId: 102 } },
    { name: 'Misión huérfana', achievement: { dofusId: 999 } },
    { name: 'Del cuarto', achievement: { dofusId: 104 } },
  ],
  pages: [
    { slug: 'la-larga-marcha', state: 'published', achievement: 1 },
    { slug: 'formacion-practica', state: 'preparing', achievement: 2 },
    { slug: 'kolimira', state: 'published', achievement: 3 },
  ],
  documents: [
    { slug: 'la-larga-marcha', collection: 'achievement-pages', page: true },
    { slug: 'formacion-practica', collection: 'achievement-pages', page: false },
    { slug: 'kolimira', collection: 'achievement-pages', page: true },
    { slug: 'jyfus', collection: 'dofus-guides', page: false },
    { slug: 'misiones-nebuloso', collection: 'dofus-guides', page: true },
  ],
  ...extra,
})

describe('stubKeys', () => {
  it('saca el slug de Squarespace del título: sin acentos y sin la ñ, como hacía Squarespace', () => {
    expect(stubKeys('Formación de primer año')).toContain('formacion-de-primer-ao')
    expect(stubKeys('Formación de primer año')).toContain('formacion-de-primer-ano')
    expect(stubKeys('¡Zape...ando!')).toContain('zape-ando')
  })
})

describe('mapStubs', () => {
  const run = (stubs: { slug: string; title: string }[], extra?: Partial<StubData>) =>
    mapStubs(stubs, data(extra), { taken: new Set(['/cart']) })

  it('una misión lleva a la página de su logro', () => {
    expect(run([{ slug: 'corazon-de-piedra', title: 'Corazón de piedra' }])).toEqual([
      {
        slug: 'corazon-de-piedra',
        kind: 'moved',
        to: '/la-larga-marcha',
        via: 'quest',
        achievement: 'La larga marcha',
      },
    ])
  })

  it('casa también con el nombre de una misión de la lista del logro', () => {
    const [outcome] = run([{ slug: 'fuego-de-dios', title: 'Fuego de dios' }])
    expect(outcome).toMatchObject({ kind: 'moved', to: '/la-larga-marcha', via: 'quest' })
  })

  it('un esbozo con el nombre de un logro lleva a su página, quitando «Logro:» del título', () => {
    const [outcome] = run([
      { slug: 'kolimira-y-dragrillado', title: 'Logro: Kolimira y Dragrillado' },
    ])
    expect(outcome).toMatchObject({ kind: 'moved', to: '/kolimira', via: 'achievement' })
  })

  it('casa por el slug aunque Squarespace se comiera la ñ', () => {
    const [outcome] = run([{ slug: 'formacion-de-primer-ao', title: 'Formación de primer año' }])
    expect(outcome).toMatchObject({ slug: 'formacion-de-primer-ao', page: 'formacion-practica' })
  })

  it('si la página del logro está En preparación, queda pendiente: sin fila (404), no 410', () => {
    const [outcome] = run([{ slug: 'formacion-de-primer-ao', title: 'Formación de primer año' }])
    expect(outcome).toEqual({
      slug: 'formacion-de-primer-ao',
      kind: 'pending',
      achievement: 'Formación práctica',
      page: 'formacion-practica',
    })
  })

  it('un nombre que casa con dos logros no elige: queda ambiguo y lo dice', () => {
    const twins = data({
      achievements: [
        { id: 7, dofusId: 207, name: 'Gemelo', quests: [] },
        { id: 6, dofusId: 206, name: 'Gemelo', quests: [] },
      ],
      quests: [
        { name: 'Misión doble', achievement: { dofusId: 207 } },
        { name: 'Misión doble', achievement: { dofusId: 206 } },
      ],
    })
    for (const stub of [
      { slug: 'gemelo', title: 'Gemelo' },
      { slug: 'mision-doble', title: 'Misión doble' },
    ]) {
      expect(mapStubs([stub], twins, { taken: new Set() })[0]).toEqual({
        slug: stub.slug,
        kind: 'ambiguous',
        candidates: ['Gemelo (206)', 'Gemelo (207)'],
      })
    }
  })

  it('la misma misión en la ficha y en la lista de su logro no es una colisión', () => {
    const [outcome] = run([{ slug: 'corazon-de-piedra', title: 'Corazón de piedra' }], {
      achievements: [
        {
          id: 1,
          dofusId: 101,
          name: 'La larga marcha',
          quests: [{ name: 'Corazón de piedra' }],
        },
      ],
    })
    expect(outcome).toMatchObject({ kind: 'moved', to: '/la-larga-marcha' })
  })

  it('no depende del orden en que llegan los datos', () => {
    const stubs = LEGACY_STUBS.slice(0, 40)
    const base = data()
    const reversed: StubData = {
      achievements: [...base.achievements].reverse(),
      quests: [...base.quests].reverse(),
      pages: [...base.pages].reverse(),
      documents: [...base.documents].reverse(),
    }
    expect(mapStubs(stubs, reversed, { taken: new Set() })).toEqual(
      mapStubs(stubs, base, { taken: new Set() }),
    )
  })

  it('un logro sin página, o una misión sin logro conocido, da 410', () => {
    expect(run([{ slug: 'del-cuarto', title: 'Del cuarto' }])[0]).toMatchObject({
      kind: 'gone',
      reason: 'no-page',
      achievement: 'Sin página',
    })
    expect(run([{ slug: 'mision-huerfana', title: 'Misión huérfana' }])[0]).toMatchObject({
      kind: 'gone',
      reason: 'unmatched',
    })
    expect(run([{ slug: 'se-busca-boarus', title: 'Se busca: Boarus' }])[0]).toMatchObject({
      kind: 'gone',
      reason: 'unmatched',
    })
  })

  it('nunca redirige un slug que ya es un documento de ta-web', () => {
    expect(run([{ slug: 'jyfus', title: 'JYFUS' }])[0]).toEqual({
      slug: 'jyfus',
      kind: 'skipped',
      reason: 'document',
      detail: 'dofus-guides',
    })
  })

  it('deja fuera lo que ya está en otra sección de la tabla', () => {
    expect(run([{ slug: 'cart', title: 'Torrente Arcano' }])[0]).toMatchObject({
      kind: 'skipped',
      reason: 'other-section',
    })
  })

  it('los esbozos de un Dofus van a su guía de Dofus, si es una página', () => {
    const [outcome] = run([{ slug: 'dofus-nebuloso', title: 'DOFUS NEBULOSO' }])
    expect(outcome).toMatchObject({ kind: 'moved', to: '/misiones-nebuloso', via: 'override' })

    const [hidden] = mapStubs(
      [{ slug: 'dofus-nebuloso', title: 'DOFUS NEBULOSO' }],
      data({ documents: [] }),
      { taken: new Set() },
    )
    expect(hidden).toMatchObject({ kind: 'gone', reason: 'no-page' })
  })
})

describe('stubsSection y stubReport', () => {
  const outcomes = mapStubs(
    [
      { slug: 'corazon-de-piedra', title: 'Corazón de piedra' },
      { slug: 'formacion-de-primer-ao', title: 'Formación de primer año' },
      { slug: 'se-busca-boarus', title: 'Se busca: Boarus' },
      { slug: 'jyfus', title: 'JYFUS' },
    ],
    data(),
    { taken: new Set() },
  )

  it('la sección lleva las redirecciones temporales y los 410, sin lo pendiente ni lo saltado', () => {
    expect(stubsSection(outcomes)).toEqual({
      permanent: false,
      moved: { '/corazon-de-piedra': '/la-larga-marcha' },
      gone: ['/se-busca-boarus'],
    })
  })

  it('el día del corte (cutover) sus redirecciones pasan a 301', () => {
    expect(stubsSection(outcomes, { cutover: true })).toEqual({
      moved: { '/corazon-de-piedra': '/la-larga-marcha' },
      gone: ['/se-busca-boarus'],
    })
  })

  it('el informe cuenta cada grupo y nombra cada esbozo', () => {
    const report = stubReport(outcomes)
    expect(report).toMatch(/Redirecciones: 1/)
    expect(report).toMatch(/410: 1/)
    expect(report).toMatch(/Pendientes: 1/)
    expect(report).toMatch(/\/corazon-de-piedra → \/la-larga-marcha/)
    expect(report).toMatch(/\/formacion-de-primer-ao.*formacion-practica/)
    expect(report).toMatch(/\/se-busca-boarus/)
    expect(report).toMatch(/\/jyfus.*dofus-guides/)
  })
})

describe('LEGACY_STUBS', () => {
  it('son los 166 esbozos del rastreo, sin repetir', () => {
    expect(LEGACY_STUBS).toHaveLength(166)
    expect(new Set(LEGACY_STUBS.map((stub) => stub.slug)).size).toBe(166)
  })
})

describe('stubReport, ambiguos', () => {
  it('nombra los candidatos para que Torre elija uno en STUB_OVERRIDES', () => {
    const report = stubReport([
      { slug: 'gemelo', kind: 'ambiguous', candidates: ['A (1)', 'B (2)'] },
    ])
    expect(report).toMatch(/Ambiguos: 1/)
    expect(report).toMatch(/\/gemelo: A \(1\), B \(2\)/)
  })
})
