import type { ArrayField, Field, GroupField, SelectField } from 'payload'
import type { Access as AccessFn } from 'payload'
import { describe, expect, it } from 'vitest'

import { Checklists } from '@/collections/Checklists'
import { isPanelUser, readPublishedOrAll } from '@/collections/editorial-access'
import { validateSlug } from '@/collections/QuestGuides'
import { ROOT_SLUG_COLLECTIONS } from '@/collections/root-slug'

/** Los campos con nombre, también los de una fila o un desplegable, que solo los colocan. */
const named = (fields: Field[]): Field[] =>
  fields.flatMap((candidate) =>
    candidate.type === 'row' || candidate.type === 'collapsible'
      ? named(candidate.fields)
      : candidate.type === 'tabs'
        ? candidate.tabs.flatMap((tab) => ('name' in tab ? [] : named(tab.fields)))
        : [candidate],
  )

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
    expect(Checklists.admin).toMatchObject({ useAsTitle: 'name', group: 'Contenido' })
    expect(Checklists.versions).toEqual({ drafts: true, maxPerDoc: 50 })
  })

  it('el panel edita y solo un administrador borra; los visitantes solo leen lo publicado', () => {
    expect(Checklists.access).toMatchObject({
      read: readPublishedOrAll,
      create: isPanelUser,
      update: isPanelUser,
    })
  })

  it('un editor solo borra lo que no vino de la importación; un administrador, todo', () => {
    const remove = (user: unknown) =>
      Checklists.access!.delete!({ req: { user } } as unknown as Parameters<AccessFn>[0])
    expect(remove(null)).toBe(false)
    expect(remove({ id: 1, role: 'admin' })).toBe(true)
    expect(remove({ id: 2, role: 'editor' })).toEqual({ importSnapshot: { exists: false } })
  })

  it('el panel abre la vista previa de la página, borrador incluido', () => {
    expect(Checklists.admin?.livePreview?.url).toBeTypeOf('function')
    expect(Checklists.admin?.preview).toBeTypeOf('function')
  })

  it('sirve los detalles de sus misiones para la isla de la página: GET /api/checklists/<slug>/details', () => {
    expect(Checklists.endpoints).toEqual([
      expect.objectContaining({ path: '/:slug/details', method: 'get' }),
    ])
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

  it('guarda lo que necesita la migración del progreso antiguo, también las claves de objetos que cambiaron', () => {
    const legacy = field(Checklists.fields, 'legacy') as GroupField
    expect(legacy.fields.map((f) => ('name' in f ? f.name : null))).toEqual([
      'prefix',
      'classicKeys',
      'guideVersion',
      'previousSteps',
      'ownedMoves',
      'genericQuests',
    ])
    expect(field(legacy.fields, 'ownedMoves')).toMatchObject({ type: 'json' })
    expect(field(legacy.fields, 'genericQuests')).toMatchObject({ type: 'json' })
  })

  it('una fila de misión puede valer con cualquiera de varias, con su propio nombre', () => {
    const quests = field(steps.fields, 'quests') as ArrayField
    expect(field(quests.fields, 'label')).toMatchObject({ type: 'text', localized: true })
    expect(field(quests.fields, 'alternatives')).toMatchObject({
      type: 'relationship',
      relationTo: 'quests',
      hasMany: true,
    })
  })

  it('las misiones que se terminan solas, con las que las terminan', () => {
    const completedBy = field(Checklists.fields, 'completedBy') as ArrayField
    expect(field(completedBy.fields, 'quest')).toMatchObject({
      relationTo: 'quests',
      required: true,
    })
    expect(field(completedBy.fields, 'by')).toMatchObject({
      relationTo: 'quests',
      hasMany: true,
      required: true,
    })
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
      { value: 'upto', label: 'Hasta una misión' },
    ])
    expect(field(achievements.fields, 'on')).toMatchObject({ type: 'number', hasMany: true })
    expect(condition(field(achievements.fields, 'on'))!({}, { mode: 'some' })).toBe(true)
    expect(condition(field(achievements.fields, 'on'))!({}, { mode: 'upto' })).toBe(true)
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
    expect(field(needs.fields, 'quests')).toMatchObject({ relationTo: 'quests', hasMany: true })

    const figure = field(steps.fields, 'figure') as GroupField
    expect(field(figure.fields, 'npc')).toMatchObject({ relationTo: 'npcs' })
    expect(field(figure.fields, 'image')).toMatchObject({ type: 'upload', relationTo: 'media' })
    expect(field(steps.fields, 'bosses')).toMatchObject({ relationTo: 'monsters', hasMany: true })
    expect(field(steps.fields, 'banner')).toMatchObject({ type: 'upload', relationTo: 'media' })
    expect(field(steps.fields, 'note')).toMatchObject({ type: 'richText', localized: true })
    expect(field(steps.fields, 'icon')).toMatchObject({ type: 'upload', relationTo: 'media' })
  })

  it('un paso va en pestañas sin nombre (no cambian lo guardado) y los datos técnicos al final (A-18)', () => {
    const [legacyNumber, tabs, technical] = steps.fields as [Field, Field, Field]
    expect(legacyNumber).toMatchObject({ name: 'legacyNumber', admin: { hidden: true } })
    expect(technical).toMatchObject({ type: 'collapsible', label: 'Datos técnicos' })
    if (tabs.type !== 'tabs') throw new Error('Faltan las pestañas del paso')
    expect(
      tabs.tabs.map((tab) => [
        tab.label,
        'name' in tab,
        tab.fields.map((f) => ('name' in f ? f.name : f.type)),
      ]),
    ).toEqual([
      ['Texto', false, ['zone', 'segments', 'closes', 'updates', 'note']],
      ['Misiones y logros', false, ['quests', 'achievements', 'bosses']],
      ['Necesitarás', false, ['needs']],
      ['Imágenes', false, ['banner', 'icon', 'figure']],
    ])
  })

  it('el esquema de los pasos va antes de los pasos, para reordenarlos (A-18)', () => {
    const names = Checklists.fields.map((f) => ('name' in f ? f.name : null))
    expect(names.indexOf('stepOutline')).toBe(names.indexOf('steps') - 1)
    expect(field(Checklists.fields, 'stepOutline')).toMatchObject({
      type: 'ui',
      admin: { components: { Field: '/components/admin/StepOutline#StepOutline' } },
    })
  })

  it('cada paso guarda su zona, la de Torre, que agrupa los pasos en la lista', () => {
    expect(field(steps.fields, 'zone')).toMatchObject({ type: 'text', localized: true })
  })

  it('cada fila de lo que necesita el paso cabe: un objeto del juego o un texto', () => {
    const needs = field(steps.fields, 'needs') as ArrayField
    // Sin objeto obligatorio: «Kama» o un hechizo no son objetos de DofusDB.
    const item = field(needs.fields, 'item') as { relationTo: string; required?: boolean }
    expect(item.relationTo).toBe('items')
    expect(item.required).toBeFalsy()
    expect(field(needs.fields, 'label')).toMatchObject({ type: 'text', localized: true })
    expect(field(needs.fields, 'quantity')).toMatchObject({ type: 'number', required: true })
    expect((field(needs.fields, 'category') as SelectField).options).toEqual([
      { value: 'resources', label: 'Recursos' },
      { value: 'consumables', label: 'Consumibles' },
      { value: 'equipment', label: 'Equipables' },
      { value: 'souls', label: 'Almas' },
      { value: 'creatures', label: 'Criaturas' },
      { value: 'cosmetics', label: 'Cosméticos' },
    ])
    expect(field(needs.fields, 'countsInTotal')).toMatchObject({
      type: 'checkbox',
      defaultValue: true,
    })
  })

  it('una fila puede llevar otras opciones, un apartado y conservarse tras usarla', () => {
    const needs = field(steps.fields, 'needs') as ArrayField
    const alternatives = field(needs.fields, 'alternatives') as ArrayField
    // Nombres de tabla cortos: los de sus versiones pasarían de los 63 caracteres de Postgres.
    expect(alternatives.dbName).toBe('checklists_need_alts')
    expect(alternatives.fields.map((f) => ('name' in f ? f.name : null))).toEqual([
      'item',
      'label',
      'quantity',
    ])
    expect(field(needs.fields, 'group')).toMatchObject({ type: 'text', localized: true })
    // Sin valor por defecto: lo no marcado se guarda vacío, como lo deja la importación.
    expect(field(needs.fields, 'reusable')).toMatchObject({ type: 'checkbox' })
    expect('defaultValue' in field(needs.fields, 'reusable')).toBe(false)
  })

  it('un paso puede cerrar o avanzar otros sin tramo «Aquí se resuelve»', () => {
    expect(field(steps.fields, 'closes')).toMatchObject({ type: 'text', hasMany: true })
    expect(field(steps.fields, 'updates')).toMatchObject({ type: 'text', hasMany: true })
  })

  it('los prerrequisitos llevan avisos y los objetos que piden, con el que los gasta', () => {
    const prerequisites = field(Checklists.fields, 'prerequisites') as GroupField
    const notes = field(prerequisites.fields, 'notes') as ArrayField
    expect(notes.dbName).toBe('checklists_pre_notes')
    expect(field(notes.fields, 'text')).toMatchObject({ type: 'textarea', localized: true })
    const needs = field(prerequisites.fields, 'needs') as ArrayField
    expect(needs.dbName).toBe('checklists_pre_needs')
    expect(field(needs.fields, 'prerequisite')).toMatchObject({ type: 'text' })
    expect(field(needs.fields, 'item')).toMatchObject({ relationTo: 'items' })
  })

  it('el texto de Torre va en tramos: normal, «detente aquí», «aquí se resuelve» y avisos', () => {
    expect((field(segments.fields, 'kind') as SelectField).options).toEqual([
      { value: 'plain', label: 'Normal' },
      { value: 'stop', label: 'Detente aquí' },
      { value: 'resolve', label: 'Aquí se resuelve' },
      { value: 'note', label: 'Nota' },
      { value: 'tip', label: 'Consejo' },
      { value: 'must', label: 'Hay que hacerlo' },
      { value: 'includes', label: 'Incluye' },
    ])
    expect(field(segments.fields, 'text')).toMatchObject({ required: true, localized: true })
    expect(condition(field(segments.fields, 'quest'))!({}, { kind: 'stop' })).toBe(true)
    expect(condition(field(segments.fields, 'quest'))!({}, { kind: 'plain' })).toBe(false)
    expect(condition(field(segments.fields, 'closes'))!({}, { kind: 'resolve' })).toBe(true)
  })

  it('un «detente aquí» puede parar varias misiones y dejar una para un paso posterior', () => {
    for (const name of ['later', 'line', 'resumeLine', 'more']) {
      expect(condition(field(segments.fields, name))!({}, { kind: 'stop' })).toBe(true)
      expect(condition(field(segments.fields, name))!({}, { kind: 'plain' })).toBe(false)
    }
    const more = field(segments.fields, 'more') as ArrayField
    expect(more.dbName).toBe('checklists_seg_more')
    expect(more.fields.map((f) => ('name' in f ? f.name : null))).toEqual([
      'quest',
      'stopObjective',
      'later',
      'line',
      'resumeLine',
    ])
  })
})
