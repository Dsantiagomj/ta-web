import type { ArrayField, CollectionConfig, Field, GroupField } from 'payload'
import { describe, expect, it } from 'vitest'

import { AchievementCategories } from '@/collections/AchievementCategories'
import { Achievements } from '@/collections/Achievements'
import { gameDataAccess } from '@/collections/game-data-access'

function field(fields: Field[], name: string): Field {
  const found = fields.find((candidate) => 'name' in candidate && candidate.name === name)
  if (!found) throw new Error(`Falta el campo ${name}`)
  return found
}

describe.each([
  { collection: Achievements, slug: 'achievements' },
  { collection: AchievementCategories, slug: 'achievement-categories' },
])('colección $slug, datos de DofusDB', ({ collection, slug }) => {
  it('es de solo lectura, en el grupo de datos del juego, sin borradores', () => {
    expect(collection.slug).toBe(slug)
    expect(collection.access).toBe(gameDataAccess)
    expect(collection.admin).toMatchObject({
      useAsTitle: 'name',
      group: 'Datos del juego (solo lectura)',
    })
    expect(collection.versions).toBeUndefined()
  })

  it('identifica cada fila por su ID de DofusDB y guarda el nombre traducible', () => {
    expect(field(collection.fields, 'dofusId')).toMatchObject({
      type: 'number',
      required: true,
      unique: true,
      index: true,
    })
    expect(field(collection.fields, 'name')).toMatchObject({
      type: 'text',
      required: true,
      localized: true,
    })
  })
})

describe('colección achievements', () => {
  const fields = (collection: CollectionConfig) => collection.fields

  it('enlaza su categoría y su icono importado a Media', () => {
    expect(field(fields(Achievements), 'category')).toMatchObject({
      type: 'relationship',
      relationTo: 'achievement-categories',
    })
    expect(field(fields(Achievements), 'icon')).toMatchObject({
      type: 'upload',
      relationTo: 'media',
    })
  })

  it('guarda una fila por misión, en orden, con sus alternativas', () => {
    const quests = field(fields(Achievements), 'quests') as ArrayField
    expect(field(quests.fields, 'name')).toMatchObject({ type: 'text', localized: true })
    expect(field(quests.fields, 'quests')).toMatchObject({
      type: 'relationship',
      relationTo: 'quests',
      hasMany: true,
    })
  })

  it('guarda las recompensas con sus objetos y los logros del juego que lo piden', () => {
    const rewards = field(fields(Achievements), 'rewards') as GroupField
    const items = field(rewards.fields, 'items') as ArrayField
    expect(field(items.fields, 'item')).toMatchObject({ relationTo: 'items' })
    const countsFor = field(fields(Achievements), 'countsFor') as ArrayField
    expect(countsFor.fields.map((sub) => ('name' in sub ? sub.name : null))).toEqual([
      'dofusId',
      'name',
      'points',
      'achievements',
      'icon',
    ])
  })
})

describe('colección achievement-categories', () => {
  it('enlaza la categoría madre y guarda el orden del juego', () => {
    expect(field(AchievementCategories.fields, 'parent')).toMatchObject({
      type: 'relationship',
      relationTo: 'achievement-categories',
    })
    expect(field(AchievementCategories.fields, 'order')).toMatchObject({ type: 'number' })
  })
})
