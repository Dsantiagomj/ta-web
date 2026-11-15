import config from '@payload-config'
import type { Access as AccessFn, Block, BlocksField, Field, GroupField } from 'payload'
import { describe, expect, it } from 'vitest'

import { layoutFields } from './helpers/fields'

import { isPanelUser, readPublishedOrAll } from '@/collections/editorial-access'
import { Pages } from '@/collections/Pages'
import { ROOT_SLUG_COLLECTIONS } from '@/collections/root-slug'
import { panelStrings } from '@/lib/admin/strings'

// Las páginas sueltas de Torre (backlog B-09): emotes, cómo llegar a un sitio y los textos
// legales, en /<slug> con los bloques de las guías.

function field(fields: Field[], name: string): Field {
  const found = layoutFields(fields).find(
    (candidate) => 'name' in candidate && candidate.name === name,
  )
  if (!found) throw new Error(`Falta el campo ${name}`)
  return found
}

type Validate = (value: unknown, options: unknown) => true | string

describe('colección pages', () => {
  it('va con el contenido de Torre, con borradores y versiones', () => {
    expect(Pages.slug).toBe('pages')
    expect(Pages.labels).toEqual({ singular: 'Página', plural: 'Páginas' })
    expect(Pages.admin).toMatchObject({ useAsTitle: 'title', group: 'Contenido' })
    // Payload completa drafts al sanear la configuración (la carga la última prueba).
    expect(Pages.versions).toMatchObject({ maxPerDoc: 50 })
    expect((Pages.versions as { drafts?: unknown }).drafts).toBeTruthy()
  })

  it('el panel edita; los visitantes solo leen lo publicado', () => {
    expect(Pages.access).toMatchObject({
      read: readPublishedOrAll,
      create: isPanelUser,
      update: isPanelUser,
    })
  })

  it('un editor solo borra lo que no vino de la importación; un administrador, todo', () => {
    const remove = (user: unknown) =>
      Pages.access!.delete!({ req: { user } } as unknown as Parameters<AccessFn>[0])
    expect(remove(null)).toBe(false)
    expect(remove({ id: 1, role: 'admin' })).toBe(true)
    expect(remove({ id: 2, role: 'editor' })).toEqual({ importSnapshot: { exists: false } })
  })

  it('comparte el espacio de slugs de la raíz y caduca su caché al guardar y al borrar', () => {
    expect(ROOT_SLUG_COLLECTIONS).toContain('pages')
    expect(Pages.hooks?.beforeValidate).toHaveLength(1)
    expect(Pages.hooks?.afterChange).toHaveLength(1)
    expect(Pages.hooks?.afterDelete).toHaveLength(1)
  })

  it('el panel abre la vista previa de la página, borrador incluido', () => {
    expect(Pages.admin?.livePreview?.url).toBeTypeOf('function')
    expect(Pages.admin?.preview).toBeTypeOf('function')
  })

  it('título, dirección y estado, en español', () => {
    expect(field(Pages.fields, 'title')).toMatchObject({
      type: 'text',
      label: 'Título',
      required: true,
      localized: true,
    })
    const slug = field(Pages.fields, 'slug') as Field & { validate: Validate }
    expect(slug).toMatchObject({ label: 'Dirección en la web', unique: true, index: true })
    expect(slug.validate('emote-sealar-con-el-dedo', {})).toBe(true)
    expect(slug.validate('Señalar', {})).not.toBe(true)
    expect(field(Pages.fields, 'state')).toMatchObject({
      type: 'select',
      label: panelStrings.state.label,
      defaultValue: 'preparing',
    })
  })

  it('el enlace a Squarespace solo se pide En preparación', () => {
    const legacy = field(Pages.fields, 'legacyHref') as Field & {
      admin: { condition: (data: unknown) => boolean }
      validate: Validate
    }
    expect(legacy).toMatchObject({ type: 'text', label: 'Enlace en Squarespace' })
    expect(legacy.admin.condition({ state: 'preparing' })).toBe(true)
    expect(legacy.admin.condition({ state: 'published' })).toBe(false)
    expect(legacy.validate('https://www.torrentearcano.com/aviso-legal', {})).toBe(true)
    expect(legacy.validate('javascript:alert(1)', {})).not.toBe(true)
  })

  it('una página superior opcional, para las migas', () => {
    expect(field(Pages.fields, 'parent')).toMatchObject({
      type: 'relationship',
      relationTo: 'pages',
      label: 'Página superior',
    })
  })

  it('el cuerpo usa los bloques de las guías de misión', () => {
    const body = field(Pages.fields, 'body') as BlocksField
    expect(body.blocks.map((block: Block) => block.slug)).toEqual([
      'richText',
      'image',
      'video',
      'callout',
      'fight',
      'step',
    ])
  })

  it('SEO como en las guías: título y descripción de 160 caracteres', () => {
    const seo = field(Pages.fields, 'seo') as GroupField
    expect(seo.label).toBe('SEO')
    expect(field(seo.fields, 'metaTitle')).toMatchObject({ label: 'Título SEO' })
    expect(field(seo.fields, 'metaDescription')).toMatchObject({
      label: 'Descripción SEO',
      maxLength: 160,
    })
  })

  it('la marca de la importación va oculta y no pasa a una copia', () => {
    const snapshot = field(Pages.fields, 'importSnapshot') as Field & {
      admin: { hidden: boolean }
      hooks: { beforeDuplicate: unknown[] }
    }
    expect(snapshot.admin.hidden).toBe(true)
    expect(snapshot.hooks.beforeDuplicate).toHaveLength(1)
  })

  it('sale en el menú tras las checklists, con su línea de la guía del panel', async () => {
    const resolved = await config
    const slugs = resolved.collections.map((collection) => collection.slug)
    expect(slugs.indexOf('pages')).toBe(slugs.indexOf('checklists') + 1)
    expect(panelStrings.collections.pages).toMatch(/\S/)
    expect(panelStrings.collections.pages).not.toMatch(/\d/)
  })
})
