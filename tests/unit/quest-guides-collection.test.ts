import type { AccessArgs, BlocksField, Field, GroupField } from 'payload'
import { describe, expect, it } from 'vitest'

import { CalloutBlock } from '@/blocks/CalloutBlock'
import { ImageBlock } from '@/blocks/ImageBlock'
import { RichTextBlock } from '@/blocks/RichTextBlock'
import { VideoBlock } from '@/blocks/VideoBlock'
import { validateOptionalUrl } from '@/collections/Media'
import { QuestGuides, questGuidesAccess, validateSlug } from '@/collections/QuestGuides'

function field(name: string, fields: Field[] = QuestGuides.fields): Field {
  const found = fields.find((candidate) => 'name' in candidate && candidate.name === name)
  if (!found) throw new Error(`Falta el campo ${name}`)
  return found
}

// Solo req.user importa para estos permisos.
function accessArgs(user: unknown): AccessArgs {
  return { req: { user } } as unknown as AccessArgs
}

const panelUser = { id: 1, email: 'torre@torrentearcano.test', collection: 'users' }

describe('colección quest-guides', () => {
  it('usa el slug quest-guides y el título en el panel', () => {
    expect(QuestGuides.slug).toBe('quest-guides')
    expect(QuestGuides.admin).toMatchObject({
      useAsTitle: 'title',
      group: 'Guías',
      defaultColumns: ['title', 'slug', '_status', 'updatedAt'],
    })
  })

  it('guarda borradores y hasta 50 versiones por guía', () => {
    expect(QuestGuides.versions).toEqual({ drafts: true, maxPerDoc: 50 })
  })

  it('guarda el título traducible', () => {
    expect(field('title')).toMatchObject({ type: 'text', required: true, localized: true })
  })

  it('guarda un slug único, indexado, no traducible y validado', () => {
    const slug = field('slug')
    expect(slug).toMatchObject({
      type: 'text',
      required: true,
      unique: true,
      index: true,
      validate: validateSlug,
      admin: { position: 'sidebar' },
    })
    expect(slug).not.toHaveProperty('localized', true)
  })

  it('relaciona la guía con varias misiones de DofusDB, opcionales', () => {
    const quests = field('quests')
    expect(quests).toMatchObject({
      type: 'relationship',
      relationTo: 'quests',
      hasMany: true,
      admin: { position: 'sidebar' },
    })
    expect(quests).not.toHaveProperty('required', true)
  })

  it('guarda un resumen propio con prerrequisitos, objetos, recompensas e inicio', () => {
    const summary = field('summary') as GroupField
    expect(summary.type).toBe('group')
    for (const name of ['prerequisites', 'needs', 'rewards']) {
      const text = field(name, summary.fields)
      expect(text).toMatchObject({ type: 'textarea', localized: true })
      expect(text).not.toHaveProperty('required', true)
    }
    expect(field('startNpc', summary.fields)).toMatchObject({ type: 'text', localized: true })
    expect(field('startX', summary.fields)).toMatchObject({ type: 'number' })
    expect(field('startY', summary.fields)).toMatchObject({ type: 'number' })
  })

  it('arma el cuerpo con bloques de texto, imagen, vídeo y aviso', () => {
    const body = field('body') as BlocksField
    expect(body.type).toBe('blocks')
    // Sin labels, el panel muestra «Añadir Body» al elegir un bloque.
    expect(body).toMatchObject({
      label: 'Contenido',
      labels: { singular: 'Bloque', plural: 'Bloques' },
    })
    expect(body.blocks).toEqual([RichTextBlock, ImageBlock, VideoBlock, CalloutBlock])
  })

  it('guarda el título y la descripción SEO, traducibles', () => {
    const seo = field('seo') as GroupField
    expect(seo.type).toBe('group')
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

describe('validateSlug', () => {
  it('acepta slugs planos en minúsculas, cifras y guiones sueltos', () => {
    expect(validateSlug('aprendizaje-escudero')).toBe(true)
    expect(validateSlug('dofus-ocre-2')).toBe(true)
    expect(validateSlug('incarnam')).toBe(true)
  })

  it('rechaza un slug vacío', () => {
    expect(validateSlug(undefined)).toMatch(/slug/)
    expect(validateSlug(null)).toMatch(/slug/)
    expect(validateSlug('')).toMatch(/slug/)
  })

  it('rechaza tildes, eñes, mayúsculas y espacios, para que la URL quede en ASCII', () => {
    expect(validateSlug('la-misión')).toMatch(/slug/)
    expect(validateSlug('el-dueño')).toMatch(/slug/)
    expect(validateSlug('Aprendizaje-Escudero')).toMatch(/slug/)
    expect(validateSlug('aprendizaje escudero')).toMatch(/slug/)
  })

  it('rechaza guiones dobles o en los extremos', () => {
    expect(validateSlug('aprendizaje--escudero')).toMatch(/slug/)
    expect(validateSlug('-aprendizaje')).toMatch(/slug/)
    expect(validateSlug('aprendizaje-')).toMatch(/slug/)
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

  it('solo un usuario del panel crea, edita y borra guías', () => {
    for (const operation of ['create', 'update', 'delete'] as const) {
      expect(questGuidesAccess[operation](accessArgs(null))).toBe(false)
      expect(questGuidesAccess[operation](accessArgs(panelUser))).toBe(true)
    }
  })

  it('la colección usa estos permisos', () => {
    expect(QuestGuides.access).toBe(questGuidesAccess)
  })
})
