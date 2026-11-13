import type { ArrayField, Field, GroupField, SelectField } from 'payload'
import { describe, expect, it } from 'vitest'

import { Checklists } from '@/collections/Checklists'
import { isPanelUser, readPublishedOrAll } from '@/collections/editorial-access'
import { validateSlug } from '@/collections/QuestGuides'
import { ROOT_SLUG_COLLECTIONS } from '@/collections/root-slug'

/** Los campos con nombre, también los de una fila (row), que solo los coloca en el panel. */
const named = (fields: Field[]): Field[] =>
  fields.flatMap((candidate) => (candidate.type === 'row' ? named(candidate.fields) : [candidate]))

function field(fields: Field[], name: string): Field {
  const found = named(fields).find((candidate) => 'name' in candidate && candidate.name === name)
  if (!found) throw new Error(`Falta el campo ${name}`)
  return found
}

const steps = field(Checklists.fields, 'steps') as ArrayField
const segments = field(steps.fields, 'segments') as ArrayField

type Condition = (data: unknown, siblingData: unknown) => boolean
const condition = (target: Field) =>
  (target as { admin?: { condition?: Condition } }).admin?.condition

describe('colección checklists', () => {
  it('va con las guías, con borradores y versiones', () => {
    expect(Checklists.slug).toBe('checklists')
    expect(Checklists.labels).toEqual({ singular: 'Checklist', plural: 'Checklists' })
    expect(Checklists.admin).toMatchObject({ useAsTitle: 'name', group: 'Guías' })
    expect(Checklists.versions).toEqual({ drafts: true, maxPerDoc: 50 })
  })

  it('Torre edita desde el panel; los visitantes solo leen lo publicado', () => {
    expect(Checklists.access).toEqual({
      read: readPublishedOrAll,
      create: isPanelUser,
      update: isPanelUser,
      delete: isPanelUser,
    })
  })

  it('no se duplica desde el panel: la copia compartiría los identificadores de sus pasos', () => {
    expect(Checklists.disableDuplicate).toBe(true)
  })

  it('comparte el espacio de slugs de la raíz: /<slug>, como las guías y los logros', () => {
    expect(ROOT_SLUG_COLLECTIONS).toContain('checklists')
    expect(field(Checklists.fields, 'slug')).toMatchObject({ required: true, unique: true })
    const validate = (field(Checklists.fields, 'slug') as { validate: typeof validateSlug })
      .validate
    expect(validate('sistema')).toBe(validateSlug('sistema'))
    expect(validate('checklist-nebuloso')).toBe(true)
  })

  it('tiene nombre, descripción, orden y la guía de su Dofus', () => {
    expect(field(Checklists.fields, 'name')).toMatchObject({ required: true, localized: true })
    expect(field(Checklists.fields, 'description')).toMatchObject({ localized: true })
    expect(field(Checklists.fields, 'order')).toMatchObject({ type: 'number', required: true })
    expect(field(Checklists.fields, 'dofusGuide')).toMatchObject({
      type: 'relationship',
      relationTo: 'dofus-guides',
    })
  })

  it('tiene el estado de Torre: Publicada o En preparación', () => {
    const state = field(Checklists.fields, 'state') as SelectField
    expect(state.defaultValue).toBe('preparing')
    expect(state.options).toEqual([
      { value: 'published', label: 'Publicada' },
      { value: 'preparing', label: 'En preparación' },
    ])
  })

  it('el enlace a Squarespace solo se ve mientras está En preparación', () => {
    const legacyHref = field(Checklists.fields, 'legacyHref')
    const shown = condition(legacyHref)!
    expect(shown({ state: 'preparing' }, {})).toBe(true)
    expect(shown({ state: 'published' }, {})).toBe(false)
    const validate = (legacyHref as { validate: (value: unknown) => true | string }).validate
    expect(validate('')).toBe(true)
    expect(validate('https://www.torrentearcano.com/checklist-silvestre')).toBe(true)
    expect(validate('no es un enlace')).not.toBe(true)
  })

  it('los prerrequisitos van por grupos de filas con su clave de progreso', () => {
    const prerequisites = field(Checklists.fields, 'prerequisites') as GroupField
    expect(field(prerequisites.fields, 'intro')).toMatchObject({ localized: true })
    const groups = field(prerequisites.fields, 'groups') as ArrayField
    expect(field(groups.fields, 'title')).toMatchObject({ localized: true })
    const rows = field(groups.fields, 'rows') as ArrayField
    expect(field(rows.fields, 'key')).toMatchObject({ type: 'text', required: true })
    expect(field(rows.fields, 'text')).toMatchObject({ required: true, localized: true })
  })

  it('lo de la importación va oculto en el panel', () => {
    expect(field(Checklists.fields, 'importSnapshot')).toMatchObject({
      type: 'json',
      admin: { hidden: true },
    })
    const legacy = field(Checklists.fields, 'legacy') as GroupField
    expect(legacy.admin?.hidden).toBe(true)
    for (const name of ['prefix', 'classicKeys', 'guideVersion', 'previousSteps']) {
      expect(() => field(legacy.fields, name), name).not.toThrow()
    }
    expect(field(steps.fields, 'legacyNumber')).toMatchObject({ admin: { hidden: true } })
  })

  it('no lleva esfuerzo ni pesos: el porcentaje se calcula, nunca se guarda', () => {
    expect(() => field(steps.fields, 'effort')).toThrow()
    expect(() => field(steps.fields, 'weight')).toThrow()
  })

  it('el identificador de cada paso se ve pero no se escribe a mano', () => {
    expect(field(steps.fields, 'stepId')).toMatchObject({ type: 'text', admin: { readOnly: true } })
    expect(Checklists.hooks?.beforeValidate).toHaveLength(2)
  })

  it('cada paso guarda sus logros, misiones, objetos, figura, jefes y banner', () => {
    const achievements = field(steps.fields, 'achievements') as ArrayField
    // Un nombre de tabla corto: los identificadores de Postgres no pasan de 63 caracteres.
    expect(achievements.dbName).toBe('checklists_step_ach')
    expect(field(achievements.fields, 'achievement')).toMatchObject({
      relationTo: 'achievements',
      required: true,
    })
    expect((field(achievements.fields, 'mode') as SelectField).options).toEqual([
      { value: 'all', label: 'Completo' },
      { value: 'some', label: 'Solo algunas misiones' },
    ])
    expect(field(achievements.fields, 'on')).toMatchObject({ type: 'number', hasMany: true })
    expect(condition(field(achievements.fields, 'on'))!({}, { mode: 'some' })).toBe(true)
    expect(condition(field(achievements.fields, 'on'))!({}, { mode: 'all' })).toBe(false)

    const quests = field(steps.fields, 'quests') as ArrayField
    expect(field(quests.fields, 'quest')).toMatchObject({ relationTo: 'quests', required: true })
    expect((field(quests.fields, 'kind') as SelectField).options).toEqual([
      { value: 'mandatory', label: 'Obligatoria' },
      { value: 'optional', label: 'Opcional' },
      { value: 'take', label: 'Solo tomarla' },
    ])
    expect(field(quests.fields, 'optionalDoneBy')).toMatchObject({ type: 'text' })

    const needs = field(steps.fields, 'needs') as ArrayField
    expect(field(needs.fields, 'item')).toMatchObject({ relationTo: 'items', required: true })
    expect(field(needs.fields, 'quests')).toMatchObject({ relationTo: 'quests', hasMany: true })

    const figure = field(steps.fields, 'figure') as GroupField
    expect(field(figure.fields, 'npc')).toMatchObject({ relationTo: 'npcs' })
    expect(field(figure.fields, 'image')).toMatchObject({ type: 'upload', relationTo: 'media' })
    expect(field(steps.fields, 'bosses')).toMatchObject({ relationTo: 'monsters', hasMany: true })
    expect(field(steps.fields, 'banner')).toMatchObject({ type: 'upload', relationTo: 'media' })
    expect(field(steps.fields, 'note')).toMatchObject({ type: 'richText', localized: true })
  })

  it('el texto de Torre va en tramos: normal, «detente aquí» y «aquí se resuelve»', () => {
    expect((field(segments.fields, 'kind') as SelectField).options).toEqual([
      { value: 'plain', label: 'Normal' },
      { value: 'stop', label: 'Detente aquí' },
      { value: 'resolve', label: 'Aquí se resuelve' },
    ])
    expect(field(segments.fields, 'text')).toMatchObject({ required: true, localized: true })
    expect(condition(field(segments.fields, 'quest'))!({}, { kind: 'stop' })).toBe(true)
    expect(condition(field(segments.fields, 'quest'))!({}, { kind: 'plain' })).toBe(false)
    expect(condition(field(segments.fields, 'closes'))!({}, { kind: 'resolve' })).toBe(true)
  })
})
