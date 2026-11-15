import { describe, expect, it } from 'vitest'

import { dofusEgg } from '@/lib/dofus-guides/egg'
import type { Media } from '@/payload-types'

// El huevo de un Dofus: el que subió Torre en su guía gana al de DofusDB, en el índice, el
// menú, el póster de su checklist y la cabecera de la guía.

const media = (id: number) => ({ id, url: `/media/${id}.png` }) as Media

describe('dofusEgg', () => {
  it('el huevo que subió Torre en la guía gana a todo', () => {
    expect(
      dofusEgg({ egg: media(1), dofus: { image: media(2), correction: { image: media(3) } } }),
    ).toEqual(media(1))
  })

  it('sin el suyo, la imagen corregida del objeto y, si no, la de DofusDB', () => {
    expect(dofusEgg({ dofus: { image: media(2), correction: { image: media(3) } } })).toEqual(
      media(3),
    )
    expect(dofusEgg({ egg: null, dofus: { image: media(2) } })).toEqual(media(2))
  })

  it('un objeto oculto no da huevo, pero el de la guía sí sale', () => {
    const hidden = { image: media(2), correction: { hidden: true } }
    expect(dofusEgg({ dofus: hidden })).toBeNull()
    expect(dofusEgg({ egg: media(1), dofus: hidden })).toEqual(media(1))
  })

  it('sin poblar, nada', () => {
    expect(dofusEgg({ egg: 1, dofus: 2 })).toBeNull()
    expect(dofusEgg(null)).toBeNull()
  })
})
