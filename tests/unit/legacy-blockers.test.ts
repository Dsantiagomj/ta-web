import { describe, expect, it } from 'vitest'

import { BLOCKER_ORDER, BLOCKERS, blockerOf, noteOf } from '../../scripts/legacy-links/blockers'

// Qué o quién desbloquea cada URL vieja que este sitio aún no sirve, para la lista del corte:
// lo aplazado (clases, mazmorras, herramientas), lo que Torre publica, las filas del backlog
// y lo que nadie ha decidido todavía.

const none = { preparing: () => null }

describe('blockerOf', () => {
  it('las clases, las mazmorras y las tres herramientas están aplazadas', () => {
    expect(blockerOf('/clases-1', null, none)).toBe('classes')
    expect(blockerOf('/feca-1', null, none)).toBe('classes')
    expect(blockerOf('/selotrop', null, none)).toBe('classes')
    expect(blockerOf('/mazmorra-crunchidor', null, none)).toBe('dungeons')
    expect(blockerOf('/gruente', null, none)).toBe('dungeons')
    expect(blockerOf('/pagina-nueva', null, none)).toBe('dungeons')
    for (const tool of ['/mascotas', '/team-builder', '/sets-y-clases']) {
      expect(blockerOf(tool, null, none), tool).toBe('tools')
    }
  })

  it('lo que espera una fila del backlog: Krosmoz y las tres sueltas (S-08), Alineamiento (S-06)', () => {
    expect(blockerOf('/metalogro-krosmoz', null, none)).toBe('S-08')
    expect(blockerOf('/el-caballero-negro-y-rosa', null, none)).toBe('S-08')
    expect(blockerOf('/logro-misiones-extra-de-vulkania#ancla', null, none)).toBe('S-08')
    expect(blockerOf('/en-guardia', null, none)).toBe('S-06')
    expect(blockerOf('/tus-deseos-son-desordenes', null, none)).toBe('S-06')
  })

  it('lo publicado En preparación lo desbloquea Torre al publicarlo, según su colección', () => {
    const preparing = (slug: string) =>
      ({
        'aqui-huele-a-supervillano-muerto': 'achievement-pages',
        'dofus-ocre': 'dofus-guides',
        'aviso-legal': 'pages',
        'checklist-x': 'checklists',
      })[slug] ?? null
    expect(blockerOf('/aqui-huele-a-supervillano-muerto', null, { preparing })).toBe('S-05')
    expect(blockerOf('/dofus-ocre', null, { preparing })).toBe('dofus-guides')
    expect(blockerOf('/aviso-legal', null, { preparing })).toBe('pages')
    expect(blockerOf('/checklist-x', null, { preparing })).toBe('checklists')
  })

  it('una página legal sin documento en «Páginas» también espera a «Páginas»', () => {
    expect(blockerOf('/politica-de-cookies', null, none)).toBe('pages')
  })

  it('un esbozo vacío sin fila espera su página de logro', () => {
    expect(blockerOf('/formacion-de-primer-ao', null, none)).toBe('stub')
  })

  it('una guía que Torre escribió en Squarespace después de la importación espera el delta', () => {
    // Un esbozo que llenó (FILLED_STUBS) y la página nueva del 2026-11-15.
    expect(blockerOf('/se-busca-darma', null, none)).toBe('delta-import')
    expect(blockerOf('/hablar-con-volkaragnar', null, none)).toBe('delta-import')
  })

  it('un enlace a una ruta que aquí da 410 y no tiene página que lo sustituya: Torre lo cambia', () => {
    expect(blockerOf('/frambuesa', 'gone', none)).toBe('torre-edits')
  })

  it('lo demás está sin decidir', () => {
    expect(blockerOf('/algo-nuevo', null, none)).toBe('undecided')
    expect(noteOf('/algo-nuevo')).toBeUndefined()
  })
})

describe('BLOCKERS', () => {
  it('cada bloqueo tiene su texto en español (consola) y en inglés (docs), y su sitio en el orden', () => {
    expect(new Set(BLOCKER_ORDER)).toEqual(new Set(Object.keys(BLOCKERS)))
    for (const [key, blocker] of Object.entries(BLOCKERS)) {
      expect(blocker.es, key).toMatch(/\S/)
      expect(blocker.en, key).toMatch(/\S/)
    }
  })
})
