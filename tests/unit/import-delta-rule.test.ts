import { describe, expect, it } from 'vitest'

import { deltaUpdate } from '../../scripts/import/delta/rule'

// La regla de la importación delta (la de pnpm guides:summary-text): un campo de una guía ya
// importada cambia a lo que da ahora su página solo si sigue como lo dejó la importación. Con
// snapshot, si sigue igual al snapshot; sin snapshot, si es justo lo que la importación da de la
// página ANTERIOR (el inventario del 2026-11-02). Lo demás es de Torre: se queda y se lista.

const richText = (text: string) => [
  {
    id: 'a1',
    blockType: 'richText',
    content: { root: { children: [{ type: 'text', text }] } },
  },
]

const before = {
  title: 'Se busca: Boorro',
  summary: { rewards: '1 000 XP', prerequisites: null, needs: { notes: 'Pala' } },
  body: richText('Bosque de koalaks'),
}
const after = {
  title: 'Se busca: Boorro',
  summary: { rewards: '1 200 XP', prerequisites: null, needs: { notes: 'Pala' } },
  body: richText('Bosque de kaliptos, Koalaks.'),
}

describe('deltaUpdate', () => {
  it('sin snapshot, cambia el campo que es justo lo que la importación dio de la página anterior', () => {
    // Payload devuelve los ids de bloque y nulls: no cuentan al comparar.
    const stored = { ...before, body: [{ ...before.body[0]!, id: 'otro' }] }
    const update = deltaUpdate({ stored, snapshot: {}, before, after })

    expect(update.changes.map((change) => change.field)).toEqual(['body', 'summary.rewards'])
    expect(update.changes[0]!.to).toEqual(after.body)
    expect(update.kept).toEqual([])
  })

  it('sin snapshot, un campo distinto de lo que dio la página anterior es de Torre y se queda', () => {
    const stored = { ...before, body: richText('Bosque de koalaks, editado en el panel') }
    const update = deltaUpdate({ stored, snapshot: {}, before, after })

    expect(update.changes.map((change) => change.field)).toEqual(['summary.rewards'])
    expect(update.kept).toEqual(['body'])
  })

  it('sin snapshot, un campo que Torre vació se queda vacío', () => {
    const stored = { ...before, summary: { ...before.summary, rewards: null } }
    const update = deltaUpdate({ stored, snapshot: {}, before, after })

    expect(update.kept).toEqual(['summary.rewards'])
  })

  it('con snapshot, cambia lo que sigue igual al snapshot y deja lo que Torre cambió', () => {
    const snapshot = {
      body: richText('Lo que escribió la última importación'),
      'summary.rewards': '1 000 XP',
    }
    const stored = { ...before, body: richText('Torre lo cambió después') }
    const update = deltaUpdate({ stored, snapshot, before, after })

    expect(update.changes.map((change) => change.field)).toEqual(['summary.rewards'])
    expect(update.kept).toEqual(['body'])
  })

  it('con snapshot manda el snapshot, aunque el campo sea lo que dio la página anterior', () => {
    // El snapshot dice lo que escribió de verdad la última importación.
    const snapshot = { body: richText('Otra cosa') }
    const update = deltaUpdate({ stored: before, snapshot, before, after })

    expect(update.kept).toContain('body')
  })

  it('un campo que ya es lo que da la página nueva no cambia y entra en el snapshot', () => {
    const stored = { ...before, summary: after.summary }
    const update = deltaUpdate({ stored, snapshot: {}, before, after })

    expect(update.changes.map((change) => change.field)).toEqual(['body'])
    expect(update.snapshot['summary.rewards']).toBe('1 200 XP')
    expect(update.snapshot.title).toBe('Se busca: Boorro')
  })

  it('el snapshot nuevo guarda lo que escribe la importación, sin ids, y nada de lo que se queda', () => {
    const stored = { ...before, body: richText('De Torre') }
    const update = deltaUpdate({ stored, snapshot: {}, before, after })

    expect(update.snapshot['summary.rewards']).toBe('1 200 XP')
    expect(update.snapshot.body).toBeUndefined()
    expect(update.snapshot['summary.needs.notes']).toBe('Pala')
  })

  it('un campo de Torre con snapshot conserva su snapshot: la próxima pasada lo sigue viendo suyo', () => {
    const snapshot = { body: richText('Lo que escribió la importación') }
    const stored = { ...before, body: richText('De Torre') }
    const update = deltaUpdate({ stored, snapshot, before, after })

    expect(update.snapshot.body).toEqual(snapshot.body)
  })

  it('nada que cambiar: sin cambios ni campos de Torre', () => {
    const update = deltaUpdate({ stored: after, snapshot: {}, before, after })

    expect(update.changes).toEqual([])
    expect(update.kept).toEqual([])
  })

  it('lo que no se pudo reconstruir de la página anterior (una imagen que no está en Media) no cambia', () => {
    const unknown = { ...before, body: undefined }
    const update = deltaUpdate({ stored: before, snapshot: {}, before: unknown, after })

    expect(update.kept).toContain('body')
  })
})
