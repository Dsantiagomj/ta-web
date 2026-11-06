import { describe, expect, it } from 'vitest'

import { npcRenderKey, npcRenderUrl } from '@/lib/dofusdb/npc-render'

// El render de un PNJ: su look de DofusDB, en hexadecimal, en el renderizador de DofusDB.
// Dirección 1 mira a la derecha y 3 a la izquierda.
const HUPE_ESSE = '{74||3=12993798,4=16707303}'
const HUPE_ESSE_HEX = '7b37347c7c333d31323939333739382c343d31363730373330337d'

describe('npcRenderUrl', () => {
  it('codifica el look en hexadecimal y pide el cuerpo entero mirando a la derecha', () => {
    expect(npcRenderUrl(HUPE_ESSE, 'right')).toBe(
      `https://renderer.dofusdb.fr/look/${HUPE_ESSE_HEX}/full/1/300_300.png`,
    )
  })

  it('mirando a la izquierda usa la dirección 3', () => {
    expect(npcRenderUrl(HUPE_ESSE, 'left')).toBe(
      `https://renderer.dofusdb.fr/look/${HUPE_ESSE_HEX}/full/3/300_300.png`,
    )
  })

  it('sin look no hay render', () => {
    expect(npcRenderUrl(null, 'right')).toBeNull()
    expect(npcRenderUrl('', 'left')).toBeNull()
    expect(npcRenderUrl('   ', 'left')).toBeNull()
  })
})

describe('npcRenderKey', () => {
  it('identifica el render por PNJ, dirección y look', () => {
    const key = npcRenderKey(4412, 'right', HUPE_ESSE)
    expect(key).toMatch(/^dofusdb-npc-render:4412:right:[0-9a-f]{12}$/)
    expect(npcRenderKey(4412, 'right', HUPE_ESSE)).toBe(key)
  })

  it('cambia si cambia el look o la dirección', () => {
    const key = npcRenderKey(4412, 'right', HUPE_ESSE)
    expect(npcRenderKey(4412, 'left', HUPE_ESSE)).not.toBe(key)
    expect(npcRenderKey(4412, 'right', '{74||3=1}')).not.toBe(key)
    expect(npcRenderKey(4413, 'right', HUPE_ESSE)).not.toBe(key)
  })
})
