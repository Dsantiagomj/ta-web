import { describe, expect, it } from 'vitest'

import { QuestGuides } from '@/collections/QuestGuides'
import { guidePreviewUrl, previewOrigin } from '@/lib/guides/preview'

describe('guidePreviewUrl', () => {
  it('pasa por /vista-previa, que comprueba la sesión del panel antes de enseñar el borrador', () => {
    expect(guidePreviewUrl('seis-pies-bajo-tierra', 'https://torrentearcano.com')).toBe(
      'https://torrentearcano.com/vista-previa?slug=seis-pies-bajo-tierra',
    )
  })

  it('sin un slug de guía no hay vista previa', () => {
    expect(guidePreviewUrl(undefined, 'https://torrentearcano.com')).toBeNull()
    expect(guidePreviewUrl('sistema', 'https://torrentearcano.com')).toBeNull()
    expect(guidePreviewUrl('Mal Escrito', 'https://torrentearcano.com')).toBeNull()
  })
})

describe('previewOrigin', () => {
  it('usa NEXT_PUBLIC_SITE_URL: detrás del proxy la petición no sabe el dominio público', () => {
    expect(
      previewOrigin(
        { NEXT_PUBLIC_SITE_URL: 'https://torrentearcano.com/' },
        'http://10.0.0.4:8080',
      ),
    ).toBe('https://torrentearcano.com')
  })

  it('sin ella, el origen de la petición al panel', () => {
    expect(previewOrigin({}, 'http://localhost:3000')).toBe('http://localhost:3000')
  })
})

describe('vista previa en el panel', () => {
  it('quest-guides tiene vista previa en vivo y botón de vista previa', () => {
    expect(typeof QuestGuides.admin?.livePreview?.url).toBe('function')
    expect(typeof QuestGuides.admin?.preview).toBe('function')
  })
})
