import config from '@payload-config'
import type {
  Access as AccessFn,
  ArrayField,
  Block,
  BlocksField,
  CollectionConfig,
  Field,
  GroupField,
} from 'payload'
import { describe, expect, it } from 'vitest'

import { layoutFields } from './helpers/fields'

import { ClassPages } from '@/collections/ClassPages'
import { DungeonPages } from '@/collections/DungeonPages'
import { isPanelUser, readPublishedOrAll } from '@/collections/editorial-access'
import { ROOT_SLUG_COLLECTIONS } from '@/collections/root-slug'
import { isSlugMoveHook } from '@/collections/slug-redirects'
import { panelStrings } from '@/lib/admin/strings'
import { SLUG_REDIRECT_COLLECTIONS } from '@/lib/redirects/slug-redirects'

// Las páginas de clase y de mazmorra de Torre (backlog S-10 y S-11): dos colecciones de
// contenido con borradores, su estado y su enlace a Squarespace mientras no tengan página.

function field(fields: Field[], name: string): Field {
  const found = layoutFields(fields).find(
    (candidate) => 'name' in candidate && candidate.name === name,
  )
  if (!found) throw new Error(`Falta el campo ${name}`)
  return found
}

type Validate = (value: unknown, options: unknown) => true | string
type WithAdmin = Field & { admin: Record<string, unknown> }

const BOTH: [string, CollectionConfig, string, string][] = [
  ['class-pages', ClassPages, 'Clase', 'Clases'],
  ['dungeon-pages', DungeonPages, 'Mazmorra', 'Mazmorras'],
]

describe.each(BOTH)('colección %s', (slug, collection, singular, plural) => {
  it('va con el contenido de Torre, con borradores y versiones', () => {
    expect(collection.slug).toBe(slug)
    expect(collection.labels).toEqual({ singular, plural })
    expect(collection.admin).toMatchObject({ useAsTitle: 'title', group: 'Contenido' })
    expect(collection.versions).toMatchObject({ maxPerDoc: 50 })
    expect((collection.versions as { drafts?: unknown }).drafts).toBeTruthy()
  })

  it('el panel edita; los visitantes solo leen lo publicado', () => {
    expect(collection.access).toMatchObject({
      read: readPublishedOrAll,
      create: isPanelUser,
      update: isPanelUser,
    })
  })

  it('un editor solo borra lo que no vino de la importación; un administrador, todo', () => {
    const remove = (user: unknown) =>
      collection.access!.delete!({ req: { user } } as unknown as Parameters<AccessFn>[0])
    expect(remove(null)).toBe(false)
    expect(remove({ id: 1, role: 'admin' })).toBe(true)
    expect(remove({ id: 2, role: 'editor' })).toEqual({ importSnapshot: { exists: false } })
  })

  it('comparte el espacio de slugs de la raíz y redirige una dirección cambiada', () => {
    expect(ROOT_SLUG_COLLECTIONS).toContain(slug)
    expect(SLUG_REDIRECT_COLLECTIONS).toContain(slug)
    expect(collection.hooks?.beforeValidate).toHaveLength(1)
    expect(collection.hooks?.beforeChange).toHaveLength(1)
    expect(collection.hooks?.afterChange?.filter(isSlugMoveHook)).toHaveLength(1)
  })

  it('caduca la caché del menú al guardar y al borrar', () => {
    expect(collection.hooks?.afterChange).toHaveLength(2)
    expect(collection.hooks?.afterDelete).toHaveLength(1)
  })

  it('título, dirección de Squarespace y estado, en español', () => {
    expect(field(collection.fields, 'title')).toMatchObject({
      type: 'text',
      label: 'Título',
      required: true,
      localized: true,
    })
    const slugField = field(collection.fields, 'slug') as Field & { validate: Validate }
    expect(slugField).toMatchObject({ label: 'Dirección en la web', unique: true, index: true })
    expect(slugField.validate('feca-1', {})).toBe(true)
    expect(slugField.validate('Feca', {})).not.toBe(true)
    expect(field(collection.fields, 'state')).toMatchObject({
      type: 'select',
      label: panelStrings.state.label,
      defaultValue: 'preparing',
    })
  })

  it('aún no se puede poner Publicada: la página de esta web llega más adelante', () => {
    const state = field(collection.fields, 'state') as Field & { validate: Validate }
    const options = {
      required: true,
      hasMany: false,
      options: ['published', 'preparing'],
      req: { t: (key: string) => key },
    }
    expect(state.validate('preparing', options)).toBe(true)
    expect(state.validate('published', options)).toMatch(/En preparación/)
  })

  it('el enlace a Squarespace solo se pide En preparación', () => {
    const legacy = field(collection.fields, 'legacyHref') as WithAdmin & { validate: Validate }
    const condition = legacy.admin.condition as (data: unknown) => boolean
    expect(legacy).toMatchObject({ type: 'text', label: 'Enlace en Squarespace' })
    expect(condition({ state: 'preparing' })).toBe(true)
    expect(condition({ state: 'published' })).toBe(false)
    expect(legacy.validate('https://www.torrentearcano.com/feca-1', {})).toBe(true)
    expect(legacy.validate('javascript:alert(1)', {})).not.toBe(true)
  })

  it('decide si sale en el menú y con qué nombre', () => {
    expect(field(collection.fields, 'inMenu')).toMatchObject({
      type: 'checkbox',
      label: 'Sale en el menú',
      defaultValue: true,
    })
    expect(field(collection.fields, 'menuName')).toMatchObject({
      type: 'text',
      label: 'Nombre en el menú',
      localized: true,
    })
  })

  it('el texto usa los bloques de las guías de misión, combate incluido', () => {
    const body = field(collection.fields, 'body') as BlocksField
    expect(body.blocks.map((block: Block) => block.slug)).toEqual([
      'richText',
      'image',
      'video',
      'callout',
      'fight',
      'table',
      'step',
    ])
  })

  it('SEO como en las páginas sueltas', () => {
    const seo = field(collection.fields, 'seo') as GroupField
    expect(field(seo.fields, 'metaTitle')).toMatchObject({ label: 'Título SEO' })
    expect(field(seo.fields, 'metaDescription')).toMatchObject({ maxLength: 160 })
  })

  it('la marca de la importación va oculta y no pasa a una copia', () => {
    const snapshot = field(collection.fields, 'importSnapshot') as WithAdmin & {
      hooks: { beforeDuplicate: unknown[] }
    }
    expect(snapshot.admin.hidden).toBe(true)
    expect(snapshot.hooks.beforeDuplicate).toHaveLength(1)
  })

  it('sale en el menú del panel tras las páginas, con su línea de la guía', async () => {
    const resolved = await config
    const slugs: string[] = resolved.collections.map((candidate) => candidate.slug)
    expect(slugs.indexOf(slug)).toBeGreaterThan(slugs.indexOf('pages'))
    expect(slugs.indexOf(slug)).toBeLessThan(slugs.indexOf('media'))
    const line = panelStrings.collections[slug as keyof typeof panelStrings.collections]
    expect(line).toMatch(/\S/)
    expect(line).not.toMatch(/\d/)
  })
})

describe('las builds de una clase', () => {
  it.each(['pvmBuilds', 'pvpBuilds'])(
    '%s: imagen obligatoria, enlace y nombre opcionales',
    (name) => {
      const builds = field(ClassPages.fields, name) as ArrayField & WithAdmin
      expect(builds.type).toBe('array')
      expect(field(builds.fields, 'image')).toMatchObject({
        type: 'upload',
        relationTo: 'media',
        required: true,
      })
      const link = field(builds.fields, 'link') as Field & { validate: Validate }
      expect(link).toMatchObject({ type: 'text', label: 'Enlace' })
      expect(link.validate('https://www.dofusbook.net/fr/membre/464797-huz/equipements', {})).toBe(
        true,
      )
      expect(link.validate('javascript:alert(1)', {})).not.toBe(true)
      expect(field(builds.fields, 'name')).toMatchObject({ type: 'text', localized: true })
      const components = builds.admin.components as { RowLabel: { path: string } }
      expect(components.RowLabel.path).toContain('#TextRowLabel')
    },
  )

  it('PVM y PVP con sus nombres de siempre', () => {
    expect(field(ClassPages.fields, 'pvmBuilds')).toMatchObject({ label: 'Builds PVM' })
    expect(field(ClassPages.fields, 'pvpBuilds')).toMatchObject({ label: 'Builds PVP' })
  })
})

describe('la mazmorra del juego', () => {
  it('enlaza, si Torre quiere, la mazmorra de DofusDB con sus jefes y su nivel', () => {
    expect(field(DungeonPages.fields, 'dungeon')).toMatchObject({
      type: 'relationship',
      relationTo: 'dungeons',
      label: 'Mazmorra del juego',
    })
    expect((field(DungeonPages.fields, 'dungeon') as { required?: boolean }).required).toBeFalsy()
  })
})
