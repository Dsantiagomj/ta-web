import type { Field, GlobalConfig } from 'payload'
import { afterEach, describe, expect, it, vi } from 'vitest'

const revalidateTag = vi.hoisted(() => vi.fn())
vi.mock('next/cache', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/cache')>()),
  revalidateTag,
}))

import { isPanelUser } from '@/collections/editorial-access'
import { IndexTexts } from '@/globals/IndexTexts'
import { SiteSettings } from '@/globals/SiteSettings'
import { SITE_COPY_TAG } from '@/lib/site-copy/cache'
import { indexTextDefaults, siteSettingsDefaults } from '@/lib/site-copy/defaults'

afterEach(() => revalidateTag.mockReset())

type Leaf = { path: string; field: Field }

/** Los campos con datos del global, por su camino (las pestañas con nombre cuentan). */
function leaves(fields: Field[], prefix = ''): Leaf[] {
  return fields.flatMap((field): Leaf[] => {
    if (field.type === 'tabs') {
      return field.tabs.flatMap((tab) =>
        'name' in tab && tab.name
          ? leaves(tab.fields, `${prefix}${tab.name}.`)
          : leaves(tab.fields, prefix),
      )
    }
    if (field.type === 'group' && 'name' in field && field.name) {
      return leaves(field.fields, `${prefix}${field.name}.`)
    }
    if ('name' in field) return [{ path: `${prefix}${field.name}`, field }]
    return []
  })
}

/** Los textos de siempre, por su camino. */
function defaultPaths(value: unknown, prefix = ''): Record<string, string> {
  if (typeof value === 'string') return { [prefix.slice(0, -1)]: value }
  return Object.assign(
    {},
    ...Object.entries(value as Record<string, unknown>).map(([key, child]) =>
      defaultPaths(child, `${prefix}${key}.`),
    ),
  )
}

const globals: [GlobalConfig, string, string, unknown][] = [
  [SiteSettings, 'site-settings', 'Ajustes del sitio', siteSettingsDefaults],
  [IndexTexts, 'index-texts', 'Portada e índices', indexTextDefaults],
]

describe.each(globals)('global %#', (global, slug, label, defaults) => {
  it('va en Ajustes, la edita Torre y la lee cualquiera', () => {
    expect(global.slug).toBe(slug)
    expect(global.label).toBe(label)
    expect(global.admin).toMatchObject({ group: 'Ajustes', hideAPIURL: true })
    expect(global.admin?.description).toBeTruthy()
    expect(global.access?.update).toBe(isPanelUser)
    expect((global.access?.read as () => boolean)()).toBe(true)
  })

  it('cada texto de siempre tiene su campo, con ese texto de partida', () => {
    const byPath = new Map(leaves(global.fields).map((leaf) => [leaf.path, leaf.field]))
    for (const [path, value] of Object.entries(defaultPaths(defaults))) {
      const field = byPath.get(path)
      expect(field, path).toBeDefined()
      expect(field, path).toMatchObject({ defaultValue: value })
      expect(['text', 'textarea'], path).toContain(field!.type)
      expect('label' in field! && field.label, path).toBeTruthy()
    }
  })

  it('los textos se traducen; las direcciones no', () => {
    for (const { path, field } of leaves(global.fields)) {
      if (field.type !== 'text' && field.type !== 'textarea') continue
      expect(Boolean('localized' in field && field.localized), path).toBe(!path.endsWith('.url'))
    }
  })

  it('al guardar caduca la caché de los textos del sitio', async () => {
    expect(global.hooks?.afterChange).toHaveLength(1)
    await global.hooks!.afterChange![0]!({ doc: { id: 1 } } as never)
    expect(revalidateTag).toHaveBeenCalledWith(SITE_COPY_TAG, { expire: 0 })
  })
})

describe('Ajustes del sitio', () => {
  it('la imagen al compartir es una imagen de Media', () => {
    const image = leaves(SiteSettings.fields).find((leaf) => leaf.path === 'ogImage')?.field
    expect(image).toMatchObject({ type: 'upload', relationTo: 'media' })
  })

  it('las direcciones de las redes se comprueban en el navegador y al guardar', () => {
    const urls = leaves(SiteSettings.fields).filter((leaf) => leaf.path.endsWith('.url'))
    expect(urls.map((leaf) => leaf.path)).toEqual([
      'socials.twitch.url',
      'socials.kick.url',
      'socials.youtube.url',
      'socials.discord.url',
      'socials.kofi.url',
    ])
    for (const { field } of urls) {
      expect(field).toMatchObject({
        admin: { components: { Field: '/components/admin/ValidatedTextField#LinkUrlField' } },
      })
      const validate = (field as { validate: (value: unknown) => true | string }).validate
      expect(validate('https://kick.com/torretv')).toBe(true)
      expect(validate('kick.com')).not.toBe(true)
    }
  })
})
