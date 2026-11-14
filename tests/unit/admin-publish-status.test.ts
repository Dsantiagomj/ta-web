import { describe, expect, it } from 'vitest'

import { publishStatus, type PublishStatusInput } from '@/lib/admin/publish-status'

// A-16 (docs/research/backlog.md): una línea en la barra lateral dice qué ve un visitante,
// con el estado de publicación de Payload y el campo «Visible en la web» de Torre.

const published: PublishStatusInput = {
  saved: true,
  hasPublishedDoc: true,
  unpublishedVersionCount: 0,
  state: 'published',
  modified: false,
}

describe('publishStatus', () => {
  it('publicada y Publicada: se ve en la web', () => {
    expect(publishStatus(published)).toMatchObject({
      tone: 'live',
      text: 'En la web: visible',
    })
  })

  it('sin campo «Visible en la web» (las guías de misiones), publicada basta', () => {
    expect(publishStatus({ ...published, state: undefined })).toMatchObject({
      tone: 'live',
      text: 'En la web: visible',
    })
  })

  it('publicada pero En preparación: no se ve, y dice por qué', () => {
    expect(publishStatus({ ...published, state: 'preparing' })).toMatchObject({
      tone: 'hidden',
      text: 'No se ve en la web: En preparación',
    })
  })

  it('con borradores guardados tras lo publicado: cambios sin publicar', () => {
    const status = publishStatus({ ...published, unpublishedVersionCount: 2 })
    expect(status.tone).toBe('pending')
    expect(status.text).toBe('Tienes cambios sin publicar')
    expect(status.detail).toContain('«Publicar cambios»')
  })

  it('los cambios sin publicar ganan a En preparación: lo publicado puede ser otra cosa', () => {
    expect(
      publishStatus({ ...published, state: 'preparing', unpublishedVersionCount: 1 }).text,
    ).toBe('Tienes cambios sin publicar')
  })

  it('nunca publicada: es un borrador y no se ve', () => {
    const status = publishStatus({ ...published, hasPublishedDoc: false, state: 'published' })
    expect(status.tone).toBe('hidden')
    expect(status.text).toBe('No se ve en la web: es un borrador')
    expect(status.detail).toContain('«Publicar cambios»')
  })

  it('aún sin guardar: no se ve', () => {
    expect(
      publishStatus({
        saved: false,
        hasPublishedDoc: false,
        unpublishedVersionCount: 0,
        state: 'preparing',
        modified: true,
      }),
    ).toMatchObject({ tone: 'hidden', text: 'No se ve en la web: aún no está guardada' })
  })

  it('avisa de lo cambiado en el formulario que aún no se guardó', () => {
    expect(publishStatus({ ...published, modified: true }).unsaved).toBe(
      'Lo que acabas de cambiar aún no está guardado.',
    )
    expect(publishStatus(published).unsaved).toBeNull()
  })

  it('una página nueva no repite el aviso de cambios sin guardar', () => {
    expect(
      publishStatus({ ...published, saved: false, hasPublishedDoc: false, modified: true }).unsaved,
    ).toBeNull()
  })
})
