import config from '@payload-config'
import { describe, expect, it } from 'vitest'

import { CONTENT_DATE_COLLECTIONS, isContentDateHook } from '@/collections/content-date'

import { contentDate, formatContentDate } from '@/lib/content-date/format'
import { contentDateOnSave, editorialFingerprint } from '@/lib/content-date/rule'

// «Actualizado el» (backlog D-03, AGENTS.md, Content date): la fecha en que Torre cambió el
// contenido, no la última escritura de un script en la fila.

describe('formatContentDate', () => {
  it('escribe la fecha en español, con el día y el año', () => {
    expect(formatContentDate('2026-11-18T10:00:00.000Z')).toEqual({
      text: '18 de noviembre de 2026',
      dateTime: '2026-11-18',
    })
  })

  it('usa la hora de Madrid: las 23:30 UTC del 18 ya son el 19 allí', () => {
    expect(formatContentDate('2026-11-18T23:30:00.000Z')).toEqual({
      text: '19 de noviembre de 2026',
      dateTime: '2026-11-19',
    })
  })

  it('un día de un solo dígito va sin cero', () => {
    expect(formatContentDate('2026-03-05T12:00:00.000Z')?.text).toBe('5 de marzo de 2026')
  })

  it('sin fecha o con una que no se lee, nada', () => {
    expect(formatContentDate(null)).toBeNull()
    expect(formatContentDate('no es una fecha')).toBeNull()
  })
})

describe('contentDate', () => {
  it('la fecha del contenido gana a la de creación', () => {
    expect(
      contentDate({ contentUpdatedAt: '2026-11-10T00:00:00.000Z', createdAt: '2026-11-01' }),
    ).toEqual({ published: '2026-11-01', modified: '2026-11-10T00:00:00.000Z' })
  })

  it('sin fecha del contenido, la de creación: lo publicó un script y nadie lo cambió', () => {
    expect(contentDate({ contentUpdatedAt: null, createdAt: '2026-11-01T00:00:00.000Z' })).toEqual({
      published: '2026-11-01T00:00:00.000Z',
      modified: '2026-11-01T00:00:00.000Z',
    })
  })

  it('un cambio anterior a la creación (una semilla) adelanta la publicación', () => {
    expect(
      contentDate({ contentUpdatedAt: '2026-10-01T00:00:00.000Z', createdAt: '2026-11-01' }),
    ).toEqual({ published: '2026-10-01T00:00:00.000Z', modified: '2026-10-01T00:00:00.000Z' })
  })

  it('sin ninguna fecha, nada', () => {
    expect(contentDate({})).toEqual({ published: null, modified: null })
  })
})

describe('editorialFingerprint', () => {
  const guide = {
    id: 7,
    title: 'La ocasión hace al ladrón',
    slug: 'la-ocasion',
    body: [{ id: 'a1', blockType: 'richText', content: { root: { children: [] } } }],
    summary: { level: 20, zone: null },
    seo: { metaTitle: 'Otro título' },
    _status: 'published',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-02T00:00:00.000Z',
    contentUpdatedAt: '2026-11-02T00:00:00.000Z',
    importSnapshot: { title: 'La ocasión' },
  }

  it('no cuenta las fechas, el estado, el slug, el SEO ni lo que guarda la importación', () => {
    expect(
      editorialFingerprint({
        ...guide,
        slug: 'otra',
        seo: { metaTitle: 'Nuevo' },
        _status: 'draft',
        updatedAt: '2026-11-18T00:00:00.000Z',
        contentUpdatedAt: null,
        importSnapshot: null,
      }),
    ).toBe(editorialFingerprint(guide))
  })

  it('un campo vacío es igual que uno que no viene', () => {
    expect(editorialFingerprint({ ...guide, summary: { level: 20 } })).toBe(
      editorialFingerprint(guide),
    )
    expect(editorialFingerprint({ ...guide, tips: [], extra: { notes: null } })).toBe(
      editorialFingerprint(guide),
    )
  })

  it('una relación poblada cuenta como su ID', () => {
    const populated = { ...guide, quest: { id: 3, createdAt: 'x', name: 'Misión' } }
    expect(editorialFingerprint(populated)).toBe(editorialFingerprint({ ...guide, quest: 3 }))
  })

  it('cambia con el título, el cuerpo o el resumen', () => {
    const base = editorialFingerprint(guide)
    expect(editorialFingerprint({ ...guide, title: 'Otro' })).not.toBe(base)
    expect(editorialFingerprint({ ...guide, summary: { level: 21 } })).not.toBe(base)
    expect(editorialFingerprint({ ...guide, body: [] })).not.toBe(base)
  })
})

describe('contentDateOnSave', () => {
  const now = new Date('2026-11-18T12:00:00.000Z')
  const stored = {
    _status: 'published',
    title: 'Guía',
    body: [{ id: 'a', blockType: 'richText' }],
    contentUpdatedAt: '2026-11-01T00:00:00.000Z',
  }

  it('un borrador no cambia nada: la web sigue con lo publicado', () => {
    expect(
      contentDateOnSave({ status: 'draft', byPerson: true, stored, next: { title: 'Otra' }, now }),
    ).toEqual({ change: false })
  })

  it('un script que publica deja la fecha de lo publicado, aunque cambie el contenido', () => {
    expect(
      contentDateOnSave({
        status: 'published',
        byPerson: false,
        stored,
        next: { ...stored, title: 'Cambiada por un script' },
        now,
      }),
    ).toEqual({ change: true, value: '2026-11-01T00:00:00.000Z' })
  })

  it('un script puede escribir la fecha a propósito (la semilla de las pruebas)', () => {
    expect(
      contentDateOnSave({
        status: 'published',
        byPerson: false,
        stored: null,
        next: { title: 'Nueva', contentUpdatedAt: '2026-11-05T00:00:00.000Z' },
        now,
      }),
    ).toEqual({ change: true, value: '2026-11-05T00:00:00.000Z' })
  })

  it('un script que crea algo publicado lo deja sin fecha: vale la de creación', () => {
    expect(
      contentDateOnSave({ status: 'published', byPerson: false, stored: null, next: {}, now }),
    ).toEqual({ change: true, value: null })
  })

  it('Torre publica un cambio: la fecha es ahora', () => {
    expect(
      contentDateOnSave({
        status: 'published',
        byPerson: true,
        stored,
        next: { ...stored, title: 'Guía corregida' },
        now,
      }),
    ).toEqual({ change: true, value: '2026-11-18T12:00:00.000Z' })
  })

  it('Torre publica sin cambiar el contenido: la fecha se queda', () => {
    expect(
      contentDateOnSave({
        status: 'published',
        byPerson: true,
        stored,
        next: { ...stored, contentUpdatedAt: '2020-01-01T00:00:00.000Z', slug: 'otra' },
        now,
      }),
    ).toEqual({ change: true, value: '2026-11-01T00:00:00.000Z' })
  })

  it('la primera vez que Torre publica cuenta, aunque el borrador fuera igual', () => {
    expect(
      contentDateOnSave({
        status: 'published',
        byPerson: true,
        stored: { ...stored, _status: 'draft' },
        next: stored,
        now,
      }),
    ).toEqual({ change: true, value: '2026-11-18T12:00:00.000Z' })
    expect(
      contentDateOnSave({ status: 'published', byPerson: true, stored: null, next: stored, now }),
    ).toEqual({ change: true, value: '2026-11-18T12:00:00.000Z' })
  })
})

describe('las colecciones con página en /<slug>', () => {
  it.each(CONTENT_DATE_COLLECTIONS)(
    '%s guarda la fecha del contenido, oculta en el panel',
    async (slug) => {
      const collection = (await config).collections.find((candidate) => candidate.slug === slug)
      const field = collection?.fields.find(
        (candidate) => 'name' in candidate && candidate.name === 'contentUpdatedAt',
      )
      expect(field).toMatchObject({ type: 'date', admin: { hidden: true } })
      expect(collection?.hooks.beforeChange?.some(isContentDateHook)).toBe(true)
    },
  )
})
