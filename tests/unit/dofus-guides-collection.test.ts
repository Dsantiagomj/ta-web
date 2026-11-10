import type { Block, BlocksField, Field, GroupField, SelectField } from 'payload'
import { describe, expect, it } from 'vitest'

import { DofusGuides, validateColor } from '@/collections/DofusGuides'
import { isPanelUser, readPublishedOrAll } from '@/collections/editorial-access'
import { validateSlug } from '@/collections/QuestGuides'
import { ROOT_SLUG_COLLECTIONS } from '@/collections/root-slug'
import { isGuideSlug } from '@/lib/guides/slug'

/** Los campos con nombre, también los de una fila (row), que solo los coloca en el panel. */
const named = (fields: Field[]): Field[] =>
  fields.flatMap((candidate) => (candidate.type === 'row' ? named(candidate.fields) : [candidate]))

function field(fields: Field[], name: string): Field {
  const found = named(fields).find((candidate) => 'name' in candidate && candidate.name === name)
  if (!found) throw new Error(`Falta el campo ${name}`)
  return found
}

/** El validador de un campo, como lo llama Payload: valor y opciones. */
type Validate = (value: unknown, options: unknown) => true | string

const blockSlugs = (blocks: BlocksField) => blocks.blocks.map((block: Block) => block.slug)

describe('colección dofus-guides', () => {
  it('va con las guías, con borradores y versiones', () => {
    expect(DofusGuides.slug).toBe('dofus-guides')
    expect(DofusGuides.labels).toEqual({ singular: 'Guía de Dofus', plural: 'Guías de Dofus' })
    expect(DofusGuides.admin).toMatchObject({ useAsTitle: 'name', group: 'Guías' })
    expect(DofusGuides.versions).toEqual({ drafts: true, maxPerDoc: 50 })
  })

  it('Torre edita desde el panel; los visitantes solo leen lo publicado', () => {
    expect(DofusGuides.access).toEqual({
      read: readPublishedOrAll,
      create: isPanelUser,
      update: isPanelUser,
      delete: isPanelUser,
    })
  })

  it('comparte el espacio de slugs de la raíz: /<slug>, como las guías y los logros', () => {
    expect(ROOT_SLUG_COLLECTIONS).toContain('dofus-guides')
    expect(DofusGuides.hooks?.beforeValidate).toHaveLength(1)
  })

  it('/guias-dofus es el índice: ninguna guía puede usar ese slug', () => {
    expect(isGuideSlug('guias-dofus')).toBe(false)
  })

  it('enlaza el objeto Dofus de DofusDB, de donde sale su huevo', () => {
    expect(field(DofusGuides.fields, 'dofus')).toMatchObject({
      type: 'relationship',
      relationTo: 'items',
      unique: true,
    })
  })

  it('guarda nombre y slug, el slug con las reglas de las guías', () => {
    expect(field(DofusGuides.fields, 'name')).toMatchObject({ required: true, localized: true })
    expect(field(DofusGuides.fields, 'slug')).toMatchObject({ required: true, unique: true })
    const validate = (field(DofusGuides.fields, 'slug') as { validate: Validate }).validate
    expect(validate('sistema', {})).toBe(validateSlug('sistema'))
    expect(validate('dofus-abisal', {})).toBe(true)
  })

  it('tiene el estado de Torre: Publicada o En preparación', () => {
    const state = field(DofusGuides.fields, 'state') as SelectField
    expect(state.defaultValue).toBe('preparing')
    expect(state.options).toEqual([
      { value: 'published', label: 'Publicada' },
      { value: 'preparing', label: 'En preparación' },
    ])
  })

  it('lleva el orden, el nivel, la etiqueta, el color y otros nombres de cada Dofus', () => {
    expect(field(DofusGuides.fields, 'order')).toMatchObject({ type: 'number', required: true })
    expect(field(DofusGuides.fields, 'level')).toMatchObject({ type: 'number' })
    const tag = field(DofusGuides.fields, 'tag') as SelectField
    expect(tag.options).toEqual([
      { value: 'primordial', label: 'Primordial' },
      { value: 'event', label: 'Evento' },
    ])
    expect(tag.required).toBeFalsy()
    expect(field(DofusGuides.fields, 'color')).toMatchObject({ type: 'text' })
    expect(field(DofusGuides.fields, 'aliases')).toMatchObject({ type: 'text' })
  })

  it('el color es un hexadecimal de seis cifras, o nada', () => {
    expect(validateColor('#2a5aaa')).toBe(true)
    expect(validateColor('')).toBe(true)
    expect(validateColor(null)).toBe(true)
    expect(validateColor('azul')).not.toBe(true)
    expect(validateColor('#fff')).not.toBe(true)
  })

  it('Prerrequisitos, la intro, el cierre y las recompensas son texto con enlaces', () => {
    for (const name of ['prerequisites', 'intro', 'outro', 'rewards']) {
      expect(field(DofusGuides.fields, name), name).toMatchObject({
        type: 'richText',
        localized: true,
      })
    }
  })

  it('Necesitarás va por grupos de filas: un objeto con su cantidad o una nota', () => {
    const needs = field(DofusGuides.fields, 'needs') as GroupField
    expect(field(needs.fields, 'title')).toMatchObject({ type: 'text', localized: true })
    const groups = field(needs.fields, 'groups') as { type: string; fields: Field[] }
    expect(groups.type).toBe('array')
    expect(field(groups.fields, 'name')).toMatchObject({ type: 'text', localized: true })
    const rows = field(groups.fields, 'rows') as BlocksField
    expect(blockSlugs(rows)).toEqual(['needItem', 'needNote'])
    const item = rows.blocks.find((block) => block.slug === 'needItem')!
    expect(field(item.fields, 'item')).toMatchObject({ relationTo: 'items' })
    expect(field(item.fields, 'quantity')).toMatchObject({ type: 'number', min: 1 })
    expect(field(item.fields, 'name')).toMatchObject({ type: 'text', localized: true })
    expect(field(item.fields, 'note')).toMatchObject({ type: 'text', localized: true })
  })

  it('un objeto sin enlazar necesita al menos su nombre', () => {
    const needs = field(DofusGuides.fields, 'needs') as GroupField
    const groups = field(needs.fields, 'groups') as { fields: Field[] }
    const rows = field(groups.fields, 'rows') as BlocksField
    const item = rows.blocks.find((block) => block.slug === 'needItem')!
    const validate = (field(item.fields, 'name') as { validate: Validate }).validate
    expect(validate('', { siblingData: { item: 12 } })).toBe(true)
    expect(validate('Pepita', { siblingData: {} })).toBe(true)
    expect(validate('', { siblingData: {} })).not.toBe(true)
  })

  it('los logros y misiones van en orden: logros, metalogros, misiones y notas', () => {
    const parts = field(DofusGuides.fields, 'parts') as BlocksField
    expect(blockSlugs(parts)).toEqual([
      'dofusAchievement',
      'dofusMetalogro',
      'dofusQuests',
      'dofusQuest',
      'dofusNote',
    ])
    const achievement = parts.blocks.find((block) => block.slug === 'dofusAchievement')!
    // Las misiones salen de la página del logro: se editan en un solo sitio.
    expect(field(achievement.fields, 'achievement')).toMatchObject({
      type: 'relationship',
      relationTo: 'achievement-pages',
      required: true,
    })
    expect(field(achievement.fields, 'note')).toMatchObject({ localized: true })
    const metalogro = parts.blocks.find((block) => block.slug === 'dofusMetalogro')!
    expect(field(metalogro.fields, 'name')).toMatchObject({ required: true })
    const inner = field(metalogro.fields, 'achievements') as { fields: Field[]; dbName?: string }
    // Un nombre de tabla corto: los identificadores de Postgres no pasan de 63 caracteres.
    expect(inner.dbName).toBe('dofus_meta_ach')
    expect(field(inner.fields, 'achievement')).toMatchObject({ relationTo: 'achievement-pages' })
    const quests = parts.blocks.find((block) => block.slug === 'dofusQuests')!
    const list = field(quests.fields, 'quests') as { fields: Field[] }
    expect(field(list.fields, 'guide')).toMatchObject({ relationTo: 'quest-guides' })
    expect(field(list.fields, 'note')).toMatchObject({ localized: true })
    const quest = parts.blocks.find((block) => block.slug === 'dofusQuest')!
    expect(field(quest.fields, 'guide')).toMatchObject({
      relationTo: 'quest-guides',
      required: true,
    })
  })

  it('el cuerpo usa los bloques de las guías de misión', () => {
    const body = field(DofusGuides.fields, 'body') as BlocksField
    expect(blockSlugs(body)).toEqual(['richText', 'image', 'video', 'callout', 'fight', 'step'])
  })

  it('el vídeo es un enlace de YouTube y la checklist un nombre con su enlace', () => {
    const video = field(DofusGuides.fields, 'video') as { validate: Validate }
    expect(video.validate('', {})).toBe(true)
    expect(video.validate('https://www.youtube.com/watch?v=ovPAxnBdKYQ', {})).toBe(true)
    expect(video.validate('https://vimeo.com/1', {})).not.toBe(true)
    const checklist = field(DofusGuides.fields, 'checklist') as GroupField
    expect(field(checklist.fields, 'name')).toMatchObject({ type: 'text', localized: true })
    expect(field(checklist.fields, 'url')).toMatchObject({ type: 'text' })
  })

  it('guarda la URL de Squarespace para la importación', () => {
    expect(field(DofusGuides.fields, 'originalUrl')).toMatchObject({ type: 'text' })
  })
})
