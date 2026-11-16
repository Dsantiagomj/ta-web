import type { Field } from 'payload'
import { afterEach, describe, expect, it, vi } from 'vitest'

const revalidateTag = vi.hoisted(() => vi.fn())
vi.mock('next/cache', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/cache')>()),
  revalidateTag,
}))

import { isPanelUser } from '@/collections/editorial-access'
import { DOFUS_FEATURED, SECTIONS } from '@/components/site/nav'
import { Navigation } from '@/globals/Navigation'
import { SITE_COPY_TAG } from '@/lib/site-copy/cache'
import { navigationDefaults } from '@/lib/site-copy/defaults'
import {
  resolveNavigation,
  validateFeaturedDofus,
  validateNavSections,
} from '@/lib/site-copy/navigation'

afterEach(() => revalidateTag.mockReset())

const keys = (sections: { key: string }[]) => sections.map((s) => s.key)
const row = (key: string, extra: Record<string, unknown> = {}) => ({ id: key, key, ...extra })
/** Una guía de Dofus poblada, con su huevo subido por Torre. */
const guide = (id: number, slug: string) => ({
  id,
  name: slug,
  egg: { id: id * 10, url: `/media/${slug}.webp`, width: 128, height: 128, sizes: {} },
})

describe('resolveNavigation', () => {
  it('sin nada guardado, el menú de siempre', () => {
    expect(resolveNavigation(null)).toEqual({ sections: SECTIONS, featured: DOFUS_FEATURED })
    expect(resolveNavigation({ sections: [], featuredDofus: [] })).toEqual({
      sections: SECTIONS,
      featured: DOFUS_FEATURED,
    })
  })

  it('los valores de partida del global dan el menú de siempre', () => {
    expect(resolveNavigation(navigationDefaults)).toEqual({
      sections: SECTIONS,
      featured: DOFUS_FEATURED,
    })
  })

  it('sigue el orden de Torre y quita las secciones ocultas', () => {
    const { sections } = resolveNavigation({
      sections: [
        row('dofus'),
        row('misiones'),
        row('clases', { visible: false }),
        row('checklists'),
        row('mazmorras'),
      ],
    })
    expect(keys(sections)).toEqual(['dofus', 'misiones', 'checklists', 'mazmorras'])
  })

  it('el nombre, el nombre completo y la frase de Torre ganan; vacíos, los de siempre', () => {
    const { sections } = resolveNavigation({
      sections: [
        row('misiones', { label: 'Guías', title: '  ', description: 'Todas las misiones.' }),
      ],
    })
    expect(sections[0]).toMatchObject({
      key: 'misiones',
      label: 'Guías',
      title: 'Misiones y logros',
      description: 'Todas las misiones.',
      href: '/metalogros',
    })
  })

  it('«Próximamente» es de Torre; sin marcar, la sección enlaza', () => {
    const { sections } = resolveNavigation({
      sections: [row('clases', { soon: false }), row('misiones', { soon: true })],
    })
    const clases = sections.find((s) => s.key === 'clases')!
    const misiones = sections.find((s) => s.key === 'misiones')!
    expect(clases.soon).toBeUndefined()
    expect(misiones.soon).toBe(true)
  })

  it('una sección que falta va al final, como siempre; una repetida o desconocida no cuenta', () => {
    const { sections } = resolveNavigation({
      sections: [row('mazmorras'), row('mazmorras', { label: 'Otra' }), row('tienda')],
    })
    expect(keys(sections)).toEqual(['mazmorras', 'misiones', 'dofus', 'checklists', 'clases'])
    expect(sections[0]!.label).toBe('Mazmorras')
  })

  it('los Dofus destacados son los huevos de las guías que eligió Torre, en su orden', () => {
    const { featured } = resolveNavigation({
      featuredDofus: [guide(3, 'dofus-ebano'), guide(1, 'dofawa'), guide(2, 'jyfus')],
    })
    expect(featured).toEqual([
      { src: '/media/dofus-ebano.webp', size: 128 },
      { src: '/media/dofawa.webp', size: 128 },
      { src: '/media/jyfus.webp', size: 128 },
    ])
  })

  it('una guía sin poblar o sin huevo no sale; si no queda ninguna, los de siempre', () => {
    expect(
      resolveNavigation({ featuredDofus: [7, { id: 8, name: 'Sin huevo' }] }).featured,
    ).toEqual(DOFUS_FEATURED)
    expect(resolveNavigation({ featuredDofus: [7, guide(1, 'dofawa')] }).featured).toEqual([
      { src: '/media/dofawa.webp', size: 128 },
    ])
  })
})

describe('validateNavSections', () => {
  const all = ['misiones', 'dofus', 'checklists', 'clases', 'mazmorras'].map((key) => row(key))

  it('acepta las cinco secciones, en cualquier orden', () => {
    expect(validateNavSections(all)).toBe(true)
    expect(validateNavSections([...all].reverse())).toBe(true)
  })

  it('rechaza una fila borrada o repetida, y dice cómo quitar una sección', () => {
    const missing = validateNavSections(all.slice(1))
    expect(missing).toMatch(/Misiones y logros/)
    expect(missing).toMatch(/Sale en la web/)
    expect(validateNavSections([...all, row('dofus')])).toMatch(/Dofus/)
    expect(validateNavSections([...all.slice(1), { id: 'x' }])).not.toBe(true)
  })
})

describe('validateFeaturedDofus', () => {
  it('acepta tres o ninguno', () => {
    expect(validateFeaturedDofus([1, 2, 3])).toBe(true)
    expect(validateFeaturedDofus([])).toBe(true)
    expect(validateFeaturedDofus(null)).toBe(true)
  })

  it('con uno o dos, pide tres', () => {
    expect(validateFeaturedDofus([1, 2])).toMatch(/tres/)
  })
})

type Named = Field & { name: string }
const named = (fields: Field[]) =>
  new Map(fields.filter((f): f is Named => 'name' in f).map((f) => [f.name, f]))

describe('el global Navegación', () => {
  const fields = named(Navigation.fields)
  const sections = fields.get('sections') as Named & {
    type: 'array'
    fields: Field[]
    defaultValue: unknown
  }
  const rowFields = named(sections.fields)

  it('va en Ajustes, la edita Torre y la lee cualquiera', () => {
    expect(Navigation.slug).toBe('navigation')
    expect(Navigation.label).toBe('Navegación')
    expect(Navigation.admin).toMatchObject({ group: 'Ajustes', hideAPIURL: true })
    expect(Navigation.admin?.description).toBeTruthy()
    expect(Navigation.access?.update).toBe(isPanelUser)
    expect((Navigation.access?.read as () => boolean)()).toBe(true)
  })

  it('las secciones empiezan con el menú de siempre y no se añaden ni se borran', () => {
    expect(sections.type).toBe('array')
    expect(sections.defaultValue).toEqual(navigationDefaults.sections)
    expect(sections).toMatchObject({ minRows: 5, maxRows: 5 })
    expect(sections.validate).toBeTypeOf('function')
    expect(rowFields.get('key')).toMatchObject({ type: 'select', admin: { readOnly: true } })
  })

  it('los nombres y la frase se traducen; las casillas no', () => {
    for (const name of ['label', 'title', 'description']) {
      expect(rowFields.get(name), name).toMatchObject({ localized: true })
    }
    expect(rowFields.get('visible')).toMatchObject({ type: 'checkbox', defaultValue: true })
    expect(rowFields.get('soon')).toMatchObject({ type: 'checkbox' })
  })

  it('los Dofus destacados se eligen entre las guías de Dofus', () => {
    expect(fields.get('featuredDofus')).toMatchObject({
      type: 'relationship',
      relationTo: 'dofus-guides',
      hasMany: true,
      maxRows: 3,
    })
  })

  it('al guardar caduca la caché de los textos del sitio', async () => {
    await Navigation.hooks!.afterChange![0]!({ doc: { id: 1 } } as never)
    expect(revalidateTag).toHaveBeenCalledWith(SITE_COPY_TAG, { expire: 0 })
  })
})
