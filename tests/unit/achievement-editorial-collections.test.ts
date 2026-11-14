import type { Field, SelectField } from 'payload'
import { describe, expect, it } from 'vitest'

import { layoutFields } from './helpers/fields'

import { ProseVideoBlock } from '@/blocks/ProseVideoBlock'
import { validateVideoUrl } from '@/blocks/VideoBlock'
import { fillAchievementGroup, fillAchievementPage } from '@/collections/achievement-autofill'
import { proseEditor } from '@/collections/prose-editor'
import { AchievementGroups } from '@/collections/AchievementGroups'
import { AchievementPages } from '@/collections/AchievementPages'
import { validateSlug } from '@/collections/QuestGuides'
import { panelStrings } from '@/lib/admin/strings'

function field(fields: Field[], name: string): Field {
  const found = layoutFields(fields).find(
    (candidate) => 'name' in candidate && candidate.name === name,
  )
  if (!found) throw new Error(`Falta el campo ${name}`)
  return found
}

/** El validador de un campo, como lo llama Payload: valor y opciones. */
type Validate = (value: unknown, options: unknown) => true | string

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
    expect(collection.admin).toMatchObject({ useAsTitle: 'name', group: 'Contenido' })
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
    expect(field(collection.fields, 'slug')).toMatchObject({ required: true, unique: true })
    const validate = (field(collection.fields, 'slug') as { validate: Validate }).validate
    expect(validate('sistema', { data: {} })).toBe(validateSlug('sistema'))
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
    for (const name of ['group', 'quests', 'points']) {
      expect(noteOf(field(AchievementPages.fields, name))).toEqual({
        source: 'achievement',
        field: name,
      })
    }
    // El orden, además, dice por qué solo lo cambia un administrador (A-23).
    expect(noteOf(field(AchievementPages.fields, 'order'))).toEqual({
      source: 'achievement',
      field: 'order',
      help: panelStrings.locks.order,
    })
  })
})

describe('validación en el panel: lo vacío se rellena al guardar', () => {
  it.each([
    { collection: AchievementPages, link: 'achievement' },
    { collection: AchievementGroups, link: 'category' },
  ])(
    '$collection.slug acepta nombre y slug vacíos si hay dato de DofusDB',
    ({ collection, link }) => {
      const options = (data: Record<string, unknown>) => ({ data }) as never
      for (const name of ['name', 'slug']) {
        const validate = (field(collection.fields, name) as { validate: Validate }).validate
        expect(validate('', options({ [link]: 5 })), name).toBe(true)
        expect(validate('', options({})), name).not.toBe(true)
      }
      const slug = (field(collection.fields, 'slug') as { validate: Validate }).validate
      expect(slug('Con Mayúsculas', options({ [link]: 5 }))).not.toBe(true)
    },
  )
})

describe('la entrada y el cierre de las páginas de logro', () => {
  it('son texto enriquecido traducible con el editor que admite vídeos', () => {
    for (const name of ['intro', 'outro']) {
      expect(field(AchievementPages.fields, name)).toMatchObject({
        type: 'richText',
        localized: true,
        editor: proseEditor,
      })
    }
  })

  it('el vídeo del texto: un enlace de YouTube, su título y una portada opcional', () => {
    expect(ProseVideoBlock).toMatchObject({
      slug: 'proseVideo',
      interfaceName: 'ProseVideoBlock',
      labels: { singular: 'Vídeo', plural: 'Vídeos' },
    })
    expect(field(ProseVideoBlock.fields, 'url')).toMatchObject({
      type: 'text',
      required: true,
      validate: validateVideoUrl,
    })
    expect(field(ProseVideoBlock.fields, 'title')).toMatchObject({ type: 'text', required: true })
    expect(field(ProseVideoBlock.fields, 'poster')).toMatchObject({
      type: 'upload',
      relationTo: 'media',
    })
    expect((field(ProseVideoBlock.fields, 'poster') as { required?: boolean }).required).toBeFalsy()
  })

  it('guarda, oculto, lo último que escribió la importación de la prosa de Torre', () => {
    expect(field(AchievementPages.fields, 'importSnapshot')).toMatchObject({
      type: 'json',
      admin: { hidden: true },
    })
  })
})
