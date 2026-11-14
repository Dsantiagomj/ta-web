import type { AccessArgs, ArrayField, BlocksField, Field, GroupField } from 'payload'
import { describe, expect, it } from 'vitest'

import { CalloutBlock } from '@/blocks/CalloutBlock'
import { FightBlock } from '@/blocks/FightBlock'
import { ImageBlock } from '@/blocks/ImageBlock'
import { RichTextBlock } from '@/blocks/RichTextBlock'
import { StepBlock } from '@/blocks/StepBlock'
import { VideoBlock } from '@/blocks/VideoBlock'
import { validateOptionalUrl } from '@/collections/Media'
import {
  QuestGuides,
  questGuidesAccess,
  validateGuideSlug,
  validateGuideTitle,
  validatePickedDungeonNote,
  validateSlug,
  withoutDeletedDungeons,
} from '@/collections/QuestGuides'
import { fillFromQuest } from '@/collections/quest-guide-autofill'
import { livePicks } from '@/lib/guides/need-notes'
import { guideStrings } from '@/lib/guides/strings'
import { panelStrings } from '@/lib/admin/strings'

function field(name: string, fields: Field[] = QuestGuides.fields): Field {
  const found = fields.find((candidate) => 'name' in candidate && candidate.name === name)
  if (!found) throw new Error(`Falta el campo ${name}`)
  return found
}

// Solo req.user importa para estos permisos.
function accessArgs(user: unknown): AccessArgs {
  return { req: { user } } as unknown as AccessArgs
}

const panelUser = { id: 1, email: 'torre@torrentearcano.test', collection: 'users', role: 'admin' }
const editorUser = {
  id: 2,
  email: 'ayuda@torrentearcano.test',
  collection: 'users',
  role: 'editor',
}

describe('colección quest-guides', () => {
  it('usa el slug quest-guides y el título en el panel', () => {
    expect(QuestGuides.slug).toBe('quest-guides')
    expect(QuestGuides.admin).toMatchObject({
      useAsTitle: 'title',
      group: 'Contenido',
      defaultColumns: ['title', '_status', 'updatedAt'],
    })
  })

  it('guarda borradores y hasta 50 versiones por guía', () => {
    expect(QuestGuides.versions).toEqual({ drafts: true, maxPerDoc: 50 })
  })

  it('guarda el título traducible; vacío, sale de la misión', () => {
    expect(field('title')).toMatchObject({
      type: 'text',
      required: true,
      localized: true,
      validate: validateGuideTitle,
    })
  })

  it('rellena título, slug y SEO vacíos desde la misión antes de validar', () => {
    // Después, el slug se compara con el de logros y metalogros (tests/integration).
    expect(QuestGuides.hooks?.beforeValidate?.[0]).toBe(fillFromQuest)
    expect(QuestGuides.hooks?.beforeValidate).toHaveLength(2)
  })

  it('guarda un slug único, indexado, no traducible y validado', () => {
    const slug = field('slug')
    expect(slug).toMatchObject({
      type: 'text',
      required: true,
      unique: true,
      index: true,
      validate: validateGuideSlug,
      admin: { position: 'sidebar' },
    })
    expect(slug).not.toHaveProperty('localized', true)
  })

  it('relaciona la guía con una sola misión de DofusDB, opcional', () => {
    const quest = field('quest')
    expect(quest).toMatchObject({
      type: 'relationship',
      label: 'Misión de DofusDB',
      relationTo: 'quests',
      admin: { description: guideStrings.admin.questDescription },
    })
    expect(quest).not.toHaveProperty('hasMany', true)
    expect(quest).not.toHaveProperty('required', true)
  })

  it('la misión es el primer campo, en el área principal, y rellena el formulario al elegirla', () => {
    const [first] = QuestGuides.fields
    expect(first).toMatchObject({ name: 'quest' })
    expect(first.admin).not.toHaveProperty('position')
    expect(first.admin?.components).toEqual({
      Description: '/components/quest-guide-admin/QuestAutofill#QuestAutofill',
    })
  })

  it('guarda un resumen propio con prerrequisitos, objetos, recompensas e inicio', () => {
    const summary = field('summary') as GroupField
    expect(summary.type).toBe('group')
    expect(summary.admin?.description).toBe(guideStrings.admin.summaryDescription)
    for (const name of ['prerequisites', 'rewards']) {
      const text = field(name, summary.fields)
      expect(text).toMatchObject({ type: 'textarea', localized: true })
      expect(text).not.toHaveProperty('required', true)
    }
    expect(field('startNpc', summary.fields)).toMatchObject({ type: 'text', localized: true })
    expect(field('startX', summary.fields)).toMatchObject({ type: 'number' })
    expect(field('startY', summary.fields)).toMatchObject({ type: 'number' })
  })

  it('Necesitarás es una lista de objetos del juego con su cantidad, más notas libres', () => {
    const needs = field('needs', (field('summary') as GroupField).fields) as GroupField
    expect(needs).toMatchObject({ type: 'group', label: 'Necesitarás' })

    const items = field('items', needs.fields) as ArrayField
    expect(items).toMatchObject({
      type: 'array',
      labels: { singular: 'Objeto', plural: 'Objetos' },
      admin: {
        components: {
          Description: {
            path: '/components/quest-guide-admin/SummaryNote#SummaryNote',
            clientProps: { summaryField: 'needs' },
          },
        },
      },
    })
    expect(field('item', items.fields)).toMatchObject({
      type: 'relationship',
      relationTo: 'items',
      required: true,
    })
    expect(field('quantity', items.fields)).toMatchObject({
      type: 'number',
      required: true,
      min: 1,
      defaultValue: 1,
    })

    expect(field('notes', needs.fields)).toMatchObject({
      type: 'textarea',
      localized: true,
      admin: { description: guideStrings.admin.needsNotesDescription },
    })
  })

  it('Necesitarás deja elegir a mano la mazmorra de una nota que no muestra su jefe', () => {
    const needs = field('needs', (field('summary') as GroupField).fields) as GroupField
    const dungeons = field('dungeons', needs.fields) as ArrayField
    expect(dungeons).toMatchObject({
      type: 'array',
      label: guideStrings.admin.dungeonPicksLabel,
      labels: { singular: 'Mazmorra', plural: 'Mazmorras' },
      admin: { description: guideStrings.admin.dungeonPicksDescription },
    })
    expect(field('note', dungeons.fields)).toMatchObject({
      type: 'text',
      label: 'Nota',
      required: true,
      localized: true,
      validate: validatePickedDungeonNote,
    })
    expect(field('dungeon', dungeons.fields)).toMatchObject({
      type: 'relationship',
      label: 'Mazmorra',
      relationTo: 'dungeons',
      required: true,
    })
  })

  it('una mazmorra borrada en DofusDB no bloquea la guía: su fila se quita al guardar', () => {
    const needs = field('needs', (field('summary') as GroupField).fields) as GroupField
    const dungeons = field('dungeons', needs.fields) as ArrayField
    expect(dungeons.hooks?.beforeValidate).toContain(withoutDeletedDungeons)
  })

  describe('withoutDeletedDungeons', () => {
    const call = (value: unknown, stored: unknown) =>
      withoutDeletedDungeons({
        value,
        originalDoc: { summary: { needs: { dungeons: stored } } },
      } as never)

    it('quita la fila cuya mazmorra ya estaba vacía en lo guardado (borrada: ON DELETE SET NULL)', () => {
      const stored = [
        { id: 'a', note: 'Mazmorra Ben Ripata', dungeon: null },
        { id: 'b', note: 'Mazmorra Kumijo', dungeon: 4 },
      ]
      expect(call(stored, stored)).toEqual([stored[1]])
    })

    it('una fila nueva sin mazmorra, o una que Torre vació, se queda: el panel la pide', () => {
      const stored = [{ id: 'b', note: 'Mazmorra Kumijo', dungeon: 4 }]
      const value = [
        { id: 'b', note: 'Mazmorra Kumijo', dungeon: null },
        { id: 'c', note: 'Mazmorra Ben Ripata', dungeon: null },
      ]
      expect(call(value, stored)).toEqual(value)
      expect(call(value, undefined)).toEqual(value)
    })
  })

  it('livePicks separa las elecciones cuya nota sigue en Notas de las que ya no', () => {
    const picks = [
      { note: '1 x Mazmorra Ben Ripata.', dungeon: 7 },
      { note: 'Mazmorra Kumijo', dungeon: 8 },
    ]
    expect(livePicks(picks, '2 x Mazmorra ben ripata\n1 x Combate (solo).')).toEqual({
      live: [picks[0]],
      stale: [picks[1]],
    })
  })

  describe('validatePickedDungeonNote', () => {
    const options = (notes: string) => ({ data: { summary: { needs: { notes } } } })
    const notes = '1 x Mazmorra Ben Ripata.\n2 x Combates (solo).\nMazmorras nivel 200'

    it('vale una nota de mazmorra de Notas, con o sin cantidad y en otra capitalización', () => {
      expect(validatePickedDungeonNote('1 x Mazmorra Ben Ripata.', options(notes))).toBe(true)
      expect(validatePickedDungeonNote('mazmorra ben ripata', options(notes))).toBe(true)
      expect(validatePickedDungeonNote('Mazmorras nivel 200', options(notes))).toBe(true)
    })

    it('rechaza una nota que no está en Notas o que no es de mazmorra', () => {
      expect(validatePickedDungeonNote('Mazmorra Kumijo', options(notes))).toBe(
        guideStrings.admin.dungeonPickUnknownNote,
      )
      expect(validatePickedDungeonNote('2 x Combates (solo).', options(notes))).toBe(
        guideStrings.admin.dungeonPickUnknownNote,
      )
      expect(validatePickedDungeonNote('', options(notes))).toBe(
        guideStrings.admin.dungeonPickUnknownNote,
      )
    })
  })

  it('cada campo del resumen lleva una nota que compara su valor con lo que da DofusDB', () => {
    const summary = field('summary') as GroupField
    for (const name of ['prerequisites', 'rewards', 'startNpc', 'startX', 'startY']) {
      expect(field(name, summary.fields).admin).toEqual({
        placeholder: guideStrings.admin.summaryPlaceholder,
        components: {
          Description: {
            path: '/components/quest-guide-admin/SummaryNote#SummaryNote',
            clientProps: { summaryField: name },
          },
        },
      })
    }
  })

  it('arma el cuerpo con bloques de texto, imagen, vídeo, aviso y paso', () => {
    const body = field('body') as BlocksField
    expect(body.type).toBe('blocks')
    // Sin labels, el panel muestra «Añadir Body» al elegir un bloque.
    expect(body).toMatchObject({
      label: 'Contenido',
      labels: { singular: 'Bloque', plural: 'Bloques' },
    })
    expect(body.blocks).toEqual([
      RichTextBlock,
      ImageBlock,
      VideoBlock,
      CalloutBlock,
      FightBlock,
      StepBlock,
    ])
  })

  it('guarda el título y la descripción SEO, traducibles', () => {
    const seo = field('seo') as GroupField
    expect(seo.type).toBe('group')
    expect(seo.admin?.description).toBe(guideStrings.admin.seoDescription)
    expect(field('metaTitle', seo.fields)).toMatchObject({ type: 'text', localized: true })
    expect(field('metaDescription', seo.fields)).toMatchObject({
      type: 'textarea',
      localized: true,
      maxLength: 160,
    })
  })

  it('guarda la URL original de Squarespace, opcional', () => {
    expect(field('originalUrl')).toMatchObject({
      type: 'text',
      validate: validateOptionalUrl,
      admin: { position: 'sidebar' },
    })
    expect(field('originalUrl')).not.toHaveProperty('required', true)
  })
})

describe('validateGuideTitle', () => {
  const withQuest = { data: { quest: 1977 } }
  const withoutQuest = { data: { quest: null } }

  it('acepta un título escrito', () => {
    expect(validateGuideTitle('El cazador cazado', withoutQuest)).toBe(true)
  })

  it('vacío, lo acepta si hay misión: el título sale de ella al guardar', () => {
    expect(validateGuideTitle('', withQuest)).toBe(true)
    expect(validateGuideTitle(undefined, withQuest)).toBe(true)
  })

  it('vacío y sin misión, lo rechaza con un mensaje en español', () => {
    expect(validateGuideTitle('', withoutQuest)).toBe(guideStrings.admin.titleRequired)
    expect(validateGuideTitle('   ', { data: {} })).toBe(guideStrings.admin.titleRequired)
  })
})

describe('validateGuideSlug', () => {
  it('vacío, lo acepta si hay misión: el slug sale de ella al guardar', () => {
    expect(validateGuideSlug('', { data: { quest: 1977 } })).toBe(true)
  })

  it('vacío y sin misión, o mal escrito, lo rechaza como validateSlug', () => {
    expect(validateGuideSlug('', { data: {} })).toBe(validateSlug(''))
    expect(validateGuideSlug('La-Misión', { data: { quest: 1977 } })).toBe(
      validateSlug('La-Misión'),
    )
  })
})

describe('validateSlug', () => {
  it('acepta slugs planos en minúsculas, cifras y guiones sueltos', () => {
    expect(validateSlug('aprendizaje-escudero')).toBe(true)
    expect(validateSlug('dofus-ocre-2')).toBe(true)
    expect(validateSlug('incarnam')).toBe(true)
  })

  it('rechaza un slug vacío con su propio mensaje: pide escribir la dirección', () => {
    expect(validateSlug(undefined)).toBe(panelStrings.slug.required)
    expect(validateSlug(null)).toBe(panelStrings.slug.required)
    expect(validateSlug('')).toBe(panelStrings.slug.required)
  })

  it('rechaza tildes, eñes, mayúsculas y espacios, para que la URL quede en ASCII', () => {
    expect(validateSlug('la-misión')).toBe(panelStrings.slug.format)
    expect(validateSlug('el-dueño')).toBe(panelStrings.slug.format)
    expect(validateSlug('Aprendizaje-Escudero')).toBe(panelStrings.slug.format)
    expect(validateSlug('aprendizaje escudero')).toBe(panelStrings.slug.format)
  })

  it('rechaza guiones dobles o en los extremos', () => {
    expect(validateSlug('aprendizaje--escudero')).toBe(panelStrings.slug.format)
    expect(validateSlug('-aprendizaje')).toBe(panelStrings.slug.format)
    expect(validateSlug('aprendizaje-')).toBe(panelStrings.slug.format)
  })
})

describe('permisos de quest-guides', () => {
  it('un visitante anónimo solo lee las guías publicadas', () => {
    expect(questGuidesAccess.read(accessArgs(null))).toEqual({
      _status: { equals: 'published' },
    })
  })

  it('un usuario del panel lee todo, borradores incluidos', () => {
    expect(questGuidesAccess.read(accessArgs(panelUser))).toBe(true)
  })

  it('solo un usuario del panel crea y edita guías', () => {
    for (const operation of ['create', 'update'] as const) {
      expect(questGuidesAccess[operation](accessArgs(null))).toBe(false)
      expect(questGuidesAccess[operation](accessArgs(panelUser))).toBe(true)
      expect(questGuidesAccess[operation](accessArgs(editorUser))).toBe(true)
    }
  })

  it('un editor solo borra las guías que no vinieron de Squarespace; un administrador, todas', () => {
    expect(questGuidesAccess.delete(accessArgs(null))).toBe(false)
    expect(questGuidesAccess.delete(accessArgs(editorUser))).toEqual({
      originalUrl: { exists: false },
    })
    expect(questGuidesAccess.delete(accessArgs(panelUser))).toBe(true)
  })

  it('la colección usa estos permisos', () => {
    expect(QuestGuides.access).toBe(questGuidesAccess)
  })
})
