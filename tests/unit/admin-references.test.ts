import { describe, expect, it } from 'vitest'

import { referencedMessage } from '@/lib/admin/references'

// El mensaje del panel al negarse a borrar algo que sale en guías (backlog A-17).
describe('referencedMessage', () => {
  it('una guía, en singular', () => {
    expect(referencedMessage('media', ['Aprendizaje: Escudero'])).toBe(
      'Esta imagen sale en 1 guía: «Aprendizaje: Escudero». Quítala de ella antes de borrarla.',
    )
  })

  it('varias guías, con «y» antes de la última', () => {
    expect(referencedMessage('achievement-groups', ['Astrub', 'Amakna', 'Bonta'])).toBe(
      'Este metalogro sale en 3 guías: «Astrub», «Amakna» y «Bonta». ' +
        'Quítalo de ellas antes de borrarlo.',
    )
  })

  it('nombra diez como mucho y cuenta el resto', () => {
    const names = Array.from({ length: 13 }, (_, index) => `Guía ${index + 1}`)
    const message = referencedMessage('quest-guides', names)
    expect(message).toMatch(/^Esta guía de misión sale en 13 guías: «Guía 1», /)
    expect(message).toContain('«Guía 10» y 3 más.')
    expect(message).not.toContain('«Guía 11»')
  })
})
