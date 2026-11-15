import type { CollectionConfig, Field, GroupField } from 'payload'
import { describe, expect, it } from 'vitest'

import { Achievements } from '@/collections/Achievements'
import { Dungeons } from '@/collections/Dungeons'
import { Items } from '@/collections/Items'
import { Monsters } from '@/collections/Monsters'
import { Npcs } from '@/collections/Npcs'
import { Quests } from '@/collections/Quests'
import { scopeCorrectionWrite } from '@/collections/torre-correction'
import { corrected, hiddenByTorre } from '@/lib/game-data/correction'
import { panelStrings } from '@/lib/admin/strings'
import type { Media } from '@/payload-types'

type Named = Field & { name: string }

function named(fields: Field[]): Named[] {
  return fields.filter((candidate): candidate is Named => 'name' in candidate)
}

function correctionOf(collection: CollectionConfig): GroupField {
  const found = named(collection.fields).find((candidate) => candidate.name === 'correction')
  if (!found) throw new Error(`Falta «Corrección de Torre» en ${collection.slug}`)
  return found as GroupField
}

const subfields = (collection: CollectionConfig) =>
  named(correctionOf(collection).fields).map((candidate) => candidate.name)

describe.each([
  { collection: Npcs, fields: ['name', 'image', 'hidden'] },
  { collection: Monsters, fields: ['name', 'level', 'image', 'hidden'] },
  { collection: Items, fields: ['name', 'level', 'image', 'hidden'] },
  { collection: Achievements, fields: ['name', 'level', 'image', 'hidden'] },
  { collection: Dungeons, fields: ['name', 'level', 'image', 'hidden'] },
  { collection: Quests, fields: ['name', 'level'] },
])('«Corrección de Torre» en $collection.slug', ({ collection, fields }) => {
  it('tiene su grupo, con lo que ese dato enseña en la web', () => {
    expect(correctionOf(collection)).toMatchObject({
      type: 'group',
      label: panelStrings.correction.label,
    })
    expect(subfields(collection)).toEqual(fields)
  })

  it('la imagen se sube a Media y el nombre se traduce', () => {
    const inner = named(correctionOf(collection).fields)
    expect(inner.find((candidate) => candidate.name === 'name')).toMatchObject({
      type: 'text',
      localized: true,
    })
    const image = inner.find((candidate) => candidate.name === 'image')
    if (image) expect(image).toMatchObject({ type: 'upload', relationTo: 'media' })
  })

  it('el panel solo edita la corrección: lo demás es de solo lectura', () => {
    for (const candidate of named(collection.fields)) {
      if (candidate.name === 'correction') {
        expect((candidate.admin as { readOnly?: boolean })?.readOnly).not.toBe(true)
        continue
      }
      expect((candidate.admin as { readOnly?: boolean })?.readOnly, candidate.name).toBe(true)
    }
  })

  it('una cuenta del panel edita; nadie crea ni borra, y todos leen', () => {
    const access = collection.access!
    const req = (user: unknown) => ({ req: { user } }) as never
    expect(access.read?.(req(null))).toBe(true)
    expect(access.create?.(req({ id: 1 }))).toBe(false)
    expect(access.delete?.(req({ id: 1 }))).toBe(false)
    expect(access.update?.(req({ id: 1 }))).toBe(true)
    expect(access.update?.(req(null))).toBe(false)
  })

  it('se busca por el nombre de DofusDB y por el de Torre', () => {
    expect(collection.admin?.listSearchableFields).toEqual(['name', 'correction.name'])
  })

  it('tiene la columna «Corregido por Torre» para encontrar sus correcciones', () => {
    const flag = named(collection.fields).find((candidate) => candidate.name === 'corrected')
    expect(flag).toMatchObject({
      type: 'checkbox',
      label: panelStrings.correction.flag,
      index: true,
    })
    expect(collection.admin?.defaultColumns).toContain('corrected')
  })

  it('el hook que limita lo que se escribe va antes de guardar', () => {
    expect(collection.hooks?.beforeChange).toContain(scopeCorrectionWrite)
  })
})

describe('scopeCorrectionWrite', () => {
  const saved = {
    id: 3,
    name: 'Kerubim Crepin',
    level: 10,
    correction: { name: 'Kerubim', image: 9 },
  }
  const run = (data: Record<string, unknown>, user: unknown, operation = 'update') =>
    scopeCorrectionWrite({
      data,
      originalDoc: operation === 'update' ? saved : undefined,
      operation,
      req: { user },
    } as never) as Record<string, unknown>

  it('un script de refresco nunca escribe la corrección', () => {
    const result = run({ name: 'Kerubim Crepin (nuevo)', correction: { name: null } }, null)
    expect(result).toMatchObject({
      name: 'Kerubim Crepin (nuevo)',
      correction: { name: 'Kerubim', image: 9 },
      corrected: true,
    })
  })

  it('un script que no manda la corrección la deja como estaba', () => {
    expect(run({ name: 'Otro nombre' }, null)).toMatchObject({
      correction: { name: 'Kerubim', image: 9 },
    })
  })

  it('el panel solo cambia la corrección: lo demás vuelve a lo guardado', () => {
    const result = run(
      { name: 'Escrito en el panel', level: 99, correction: { name: '', image: null } },
      { id: 1 },
    )
    expect(result).toMatchObject({
      name: 'Kerubim Crepin',
      level: 10,
      correction: { name: '', image: null },
      corrected: false,
    })
  })

  it('al crear (los scripts) se guarda todo y se marca si trae corrección', () => {
    expect(run({ name: 'Nuevo' }, null, 'create')).toMatchObject({ corrected: false })
    expect(run({ name: 'Nuevo', correction: { hidden: true } }, null, 'create')).toMatchObject({
      corrected: true,
    })
  })
})

describe('corrected', () => {
  const media = { id: 9, url: '/m/9.png' } as Media

  it('lo que Torre escribió gana a DofusDB; lo vacío deja el dato del juego', () => {
    expect(
      corrected({
        name: 'Dofus Esmeralda',
        level: 6,
        image: 1,
        correction: { name: ' Dofus Esmeralda (huevo) ', level: 0, image: media },
      }),
    ).toMatchObject({ name: 'Dofus Esmeralda (huevo)', level: 0, image: media })
    expect(
      corrected({ name: 'Jalató', level: 3, image: 1, correction: { name: '  ', level: null } }),
    ).toMatchObject({ name: 'Jalató', level: 3, image: 1 })
  })

  it('sin corrección devuelve el mismo documento', () => {
    const doc = { name: 'Tofu', image: 1 }
    expect(corrected(doc)).toBe(doc)
  })

  it('la imagen de Torre sustituye los dos renders de un PNJ y el icono de un logro', () => {
    expect(
      corrected({ name: 'PNJ', renderRight: 1, renderLeft: 2, correction: { image: media } }),
    ).toMatchObject({ renderRight: media, renderLeft: media })
    expect(corrected({ name: 'Logro', icon: 1, correction: { image: media } })).toMatchObject({
      icon: media,
    })
  })

  it('el nivel de Torre va al nivel de la misión y al de los grados de un monstruo', () => {
    expect(corrected({ name: 'Misión', levelMin: 20, correction: { level: 25 } })).toMatchObject({
      levelMin: 25,
    })
    expect(
      corrected({ name: 'Jefe', levels: [100, 110], correction: { level: 120 } }),
    ).toMatchObject({ levels: [120] })
  })

  it('oculto solo si Torre lo marca', () => {
    expect(hiddenByTorre({ correction: { hidden: true } })).toBe(true)
    expect(hiddenByTorre({ correction: { hidden: false } })).toBe(false)
    expect(hiddenByTorre({})).toBe(false)
    expect(hiddenByTorre(null)).toBe(false)
    expect(hiddenByTorre(5)).toBe(false)
  })
})
