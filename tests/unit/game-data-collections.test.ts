import type { CollectionConfig, Field } from 'payload'
import { describe, expect, it } from 'vitest'

import { gameDataAccess } from '@/collections/game-data-access'
import { Items } from '@/collections/Items'
import { Monsters } from '@/collections/Monsters'

function field(collection: CollectionConfig, name: string): Field {
  const found = collection.fields.find(
    (candidate) => 'name' in candidate && candidate.name === name,
  )
  if (!found) throw new Error(`Falta el campo ${name} en ${collection.slug}`)
  return found
}

describe.each([
  { collection: Items, slug: 'items' },
  { collection: Monsters, slug: 'monsters' },
])('colección $slug', ({ collection, slug }) => {
  it('usa su slug, el nombre como título y el grupo de datos del juego', () => {
    expect(collection.slug).toBe(slug)
    expect(collection.admin?.useAsTitle).toBe('name')
    expect(collection.admin?.group).toBe('Datos del juego')
  })

  it('identifica cada fila por su ID de DofusDB, único e indexado', () => {
    expect(field(collection, 'dofusId')).toMatchObject({
      type: 'number',
      required: true,
      unique: true,
      index: true,
    })
  })

  it('guarda el nombre traducible', () => {
    expect(field(collection, 'name')).toMatchObject({
      type: 'text',
      required: true,
      localized: true,
    })
  })

  it('guarda solo el ID de la imagen, opcional', () => {
    expect(field(collection, 'iconId')).toMatchObject({ type: 'number' })
    expect(field(collection, 'iconId')).not.toHaveProperty('required', true)
  })

  it('guarda la fecha de refresco, opcional', () => {
    expect(field(collection, 'refreshedAt')).toMatchObject({ type: 'date' })
    expect(field(collection, 'refreshedAt')).not.toHaveProperty('required', true)
  })

  it('es de solo lectura, como las misiones', () => {
    expect(collection.access).toBe(gameDataAccess)
  })
})

describe('colección items', () => {
  it('guarda nivel y tipo opcionales', () => {
    for (const name of ['level', 'typeId']) {
      expect(field(Items, name)).toMatchObject({ type: 'number' })
      expect(field(Items, name)).not.toHaveProperty('required', true)
    }
  })
})

describe('permisos de los datos del juego', () => {
  it('cualquiera los lee y nadie los crea, edita ni borra por la API ni el panel', () => {
    expect(gameDataAccess.read()).toBe(true)
    expect(gameDataAccess.create()).toBe(false)
    expect(gameDataAccess.update()).toBe(false)
    expect(gameDataAccess.delete()).toBe(false)
  })
})
