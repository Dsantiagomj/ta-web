import { describe, expect, it } from 'vitest'

import { publishStatus, type PublishStatusInput } from '@/lib/admin/publish-status'

// A-16 (docs/research/backlog.md): una línea en la barra lateral dice qué ve un visitante.
// Lo que se ve sale de la versión publicada; el borrador solo añade «cambios sin publicar».

const live: PublishStatusInput = {
  collection: 'achievement-pages',
  saved: true,
  trashed: false,
  published: { state: 'published' },
  unpublishedVersionCount: 0,
  modified: false,
}

describe('publishStatus', () => {
  it('publicada y Publicada: se ve en la web', () => {
    expect(publishStatus(live)).toMatchObject({
      tone: 'live',
      text: 'En la web: visible',
      changes: null,
    })
  })

  it('sin campo «Visible en la web» (las guías de misiones), publicada basta', () => {
    expect(publishStatus({ ...live, collection: 'quest-guides', published: {} })).toMatchObject({
      tone: 'live',
      text: 'En la web: visible',
    })
  })

  it('con borradores tras lo publicado, sigue diciendo qué se ve y añade los cambios', () => {
    const status = publishStatus({ ...live, unpublishedVersionCount: 2 })
    expect(status.tone).toBe('pending')
    expect(status.text).toBe('En la web: visible')
    expect(status.changes).toBe(
      'Tienes cambios sin publicar: la web sigue enseñando la versión publicada.',
    )
  })

  it('lo que se ve sale de la versión publicada, no del borrador', () => {
    // Publicada En preparación con un borrador que ya dice Publicada: aún no se abre.
    const status = publishStatus({
      ...live,
      published: { state: 'preparing' },
      unpublishedVersionCount: 1,
    })
    expect(status.tone).toBe('preparing')
    expect(status.text).toBe('En la web: sale apagado, sin página')
    expect(status.changes).toContain('Tienes cambios sin publicar')
    expect(`${status.text} ${status.detail}`).not.toContain('visible')
  })

  it('En preparación dice lo que pasa en cada colección', () => {
    const preparing = (collection: string, legacyHref?: string) =>
      publishStatus({ ...live, collection, published: { state: 'preparing', legacyHref } })
    expect(preparing('achievement-pages').text).toBe('En la web: sale apagado, sin página')
    expect(preparing('achievement-groups').text).toBe(
      'En la web: se abre solo si tiene logros publicados',
    )
    expect(preparing('dofus-guides').text).toBe('En la web: el huevo sale apagado, sin página')
    expect(preparing('checklists', 'https://www.torrentearcano.com/nebuloso').text).toBe(
      'En la web: en el menú, lleva a la checklist de Squarespace',
    )
    expect(preparing('checklists').text).toBe('En la web: en el menú, apagada y sin enlace')
    for (const collection of ['achievement-pages', 'dofus-guides', 'checklists']) {
      expect(preparing(collection).detail, collection).toContain('«Visible en la web»')
    }
  })

  it('nunca publicada: es un borrador y no se ve', () => {
    const status = publishStatus({ ...live, published: null, unpublishedVersionCount: 3 })
    expect(status).toMatchObject({ tone: 'hidden', text: 'No se ve en la web: es un borrador' })
    expect(status.detail).toContain('«Publicar cambios»')
    // Todo es borrador: no hay «cambios» sobre nada publicado.
    expect(status.changes).toBeNull()
  })

  it('mientras llega la versión publicada, no afirma nada', () => {
    expect(publishStatus({ ...live, published: undefined })).toMatchObject({
      tone: 'loading',
      text: 'Comprobando qué se ve en la web…',
    })
  })

  it('si no se pudo leer la versión publicada, lo dice', () => {
    expect(publishStatus({ ...live, published: 'error' })).toMatchObject({
      tone: 'hidden',
      text: 'No se pudo comprobar qué se ve en la web.',
    })
  })

  it('en la papelera no se ve', () => {
    expect(publishStatus({ ...live, trashed: true })).toMatchObject({
      tone: 'hidden',
      text: 'No se ve en la web: está en la papelera',
    })
  })

  it('aún sin guardar: no se ve', () => {
    expect(publishStatus({ ...live, saved: false, published: null, modified: true })).toMatchObject(
      { tone: 'hidden', text: 'No se ve en la web: aún no está guardada' },
    )
  })

  it('avisa de lo cambiado en el formulario que aún no se guardó', () => {
    expect(publishStatus({ ...live, modified: true }).unsaved).toBe(
      'Lo que acabas de cambiar aún no está guardado.',
    )
    expect(publishStatus(live).unsaved).toBeNull()
    expect(publishStatus({ ...live, saved: false, modified: true }).unsaved).toBeNull()
  })
})
