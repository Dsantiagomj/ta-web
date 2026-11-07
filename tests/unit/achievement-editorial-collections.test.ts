import type { Field, SelectField } from 'payload'
import { describe, expect, it } from 'vitest'

import { fillAchievementGroup, fillAchievementPage } from '@/collections/achievement-autofill'
import { AchievementGroups } from '@/collections/AchievementGroups'
import { AchievementPages } from '@/collections/AchievementPages'
import { validateSlug } from '@/collections/QuestGuides'

function field(fields: Field[], name: string): Field {
  const found = fields.find((candidate) => 'name' in candidate && candidate.name === name)
  if (!found) throw new Error(`Falta el campo ${name}`)
  return found
}

function noteOf(candidate: Field) {
  const admin = candidate.admin as { components?: { Description?: { clientProps?: unknown } } }
  return admin?.components?.Description?.clientProps
}

describe.each([
  {
    collection: AchievementPages,
    slug: 'achievement-pages',
    fill: fillAchievementPage,
    link: 'achievement',
    source: 'achievement',
  },
  {
    collection: AchievementGroups,
    slug: 'achievement-groups',
    fill: fillAchievementGroup,
    link: 'category',
    source: 'group',
  },
])('colección $slug, de Torre', ({ collection, slug, fill, link, source }) => {
  it('va con las guías, con borradores y versiones', () => {
    expect(collection.slug).toBe(slug)
    expect(collection.admin).toMatchObject({ useAsTitle: 'name', group: 'Guías' })
    expect(collection.versions).toEqual({ drafts: true, maxPerDoc: 50 })
  })

  it('rellena desde DofusDB antes de validar y luego comprueba el slug compartido', () => {
    expect(collection.hooks?.beforeValidate?.[0]).toBe(fill)
    expect(collection.hooks?.beforeValidate).toHaveLength(2)
  })

  it('enlaza su dato de DofusDB, uno por documento', () => {
    expect(field(collection.fields, link)).toMatchObject({ type: 'relationship', unique: true })
  })

  it('guarda un slug único con las reglas de las guías', () => {
    expect(field(collection.fields, 'slug')).toMatchObject({
      required: true,
      unique: true,
      validate: validateSlug,
    })
  })

  it('tiene un estado de Torre: Publicada o En preparación', () => {
    const state = field(collection.fields, 'state') as SelectField
    expect(state.defaultValue).toBe('preparing')
    expect(state.options).toEqual([
      { value: 'published', label: 'Publicada' },
      { value: 'preparing', label: 'En preparación' },
    ])
  })

  it('el nombre lleva la nota de DofusDB', () => {
    expect(noteOf(field(collection.fields, 'name'))).toEqual({ source, field: 'name' })
  })
})

describe('achievement-groups', () => {
  it('tiene las tres partes del índice, el representante y las guías sueltas', () => {
    const section = field(AchievementGroups.fields, 'section') as SelectField
    expect(section.options).toEqual([
      { value: 'stories', label: 'Misiones generales e historias' },
      { value: 'zones', label: 'Zonas' },
      { value: 'seasonal', label: 'Eventos de temporada' },
    ])
    // Un PNJ o un monstruo: Draconiros, en Selocalipsis, podría ser un monstruo.
    expect(field(AchievementGroups.fields, 'representative')).toMatchObject({
      relationTo: ['npcs', 'monsters'],
    })
    expect(field(AchievementGroups.fields, 'guides')).toMatchObject({
      relationTo: 'quest-guides',
      hasMany: true,
    })
  })
})

describe('achievement-pages', () => {
  it('lleva la nota de DofusDB en lo que copia', () => {
    for (const name of ['group', 'order', 'quests', 'points']) {
      expect(noteOf(field(AchievementPages.fields, name))).toEqual({
        source: 'achievement',
        field: name,
      })
    }
  })
})
