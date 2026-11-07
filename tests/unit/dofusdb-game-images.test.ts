import { describe, expect, it } from 'vitest'

import { gameImageKey, gameImageUrl } from '@/lib/dofusdb/game-images'

// Los iconos de objetos y las imágenes de monstruos de DofusDB (DESIGN.md, Imagery): se
// importan una vez a Media con una clave por imagen.

describe('gameImageUrl', () => {
  it('el PNG de 128px de DofusDB: el icono del objeto o la imagen del monstruo (gfxId)', () => {
    expect(gameImageUrl('item', 47037)).toBe('https://api.dofusdb.fr/img/items/47037.png')
    expect(gameImageUrl('monster', 241)).toBe('https://api.dofusdb.fr/img/monsters/241.png')
    expect(gameImageUrl('achievement', 203)).toBe('https://api.dofusdb.fr/img/achievements/203.png')
  })
})

describe('gameImageKey', () => {
  it('una clave por imagen: varios objetos con el mismo icono comparten el archivo', () => {
    expect(gameImageKey('item', 47037)).toBe('dofusdb-item-image:47037')
    expect(gameImageKey('monster', 241)).toBe('dofusdb-monster-image:241')
    expect(gameImageKey('achievement', 203)).toBe('dofusdb-achievement-image:203')
  })
})
