import type { Field, GroupField } from 'payload'
import { afterEach, describe, expect, it, vi } from 'vitest'

const revalidateTag = vi.hoisted(() => vi.fn())
vi.mock('next/cache', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/cache')>()),
  revalidateTag,
}))

import { isPanelUser } from '@/collections/editorial-access'
import { ChecklistsIndex } from '@/globals/ChecklistsIndex'
import { CHECKLISTS_TAG } from '@/lib/checklists/cache'

afterEach(() => revalidateTag.mockReset())

const named = (fields: Field[], name: string) =>
  fields.find((candidate) => 'name' in candidate && candidate.name === name)

// La tarjeta «???» del final del índice /checklists es de Torre: la enciende, la apaga y cambia
// su texto en el panel.
describe('global checklists-index', () => {
  it('va con las checklists y la edita Torre; la lee cualquiera', () => {
    expect(ChecklistsIndex.slug).toBe('checklists-index')
    expect(ChecklistsIndex.label).toBe('Índice de checklists')
    expect(ChecklistsIndex.admin).toMatchObject({ group: 'Contenido', hideAPIURL: true })
    expect(ChecklistsIndex.access?.update).toBe(isPanelUser)
    expect((ChecklistsIndex.access?.read as () => boolean)()).toBe(true)
  })

  it('la tarjeta «???»: encendida o no, su etiqueta, su texto, su escena y su huevo', () => {
    const teaser = named(ChecklistsIndex.fields, 'teaser') as GroupField
    expect(teaser).toMatchObject({ type: 'group', label: 'Tarjeta «Próximamente»' })
    expect(named(teaser.fields, 'enabled')).toMatchObject({ type: 'checkbox', defaultValue: true })
    expect(named(teaser.fields, 'label')).toMatchObject({
      type: 'text',
      localized: true,
      defaultValue: 'En camino',
    })
    expect(named(teaser.fields, 'text')).toMatchObject({
      type: 'text',
      localized: true,
      defaultValue: '???',
    })
    expect(named(teaser.fields, 'scene')).toMatchObject({ type: 'upload', relationTo: 'media' })
    expect(named(teaser.fields, 'egg')).toMatchObject({ type: 'upload', relationTo: 'media' })
    for (const child of teaser.fields) {
      expect((child as { admin?: { description?: string } }).admin?.description).toBeTruthy()
    }
  })

  it('guarda lo que escribió la importación, oculto en el panel y en la API pública', () => {
    expect(named(ChecklistsIndex.fields, 'importSnapshot')).toMatchObject({
      type: 'json',
      hidden: true,
    })
  })

  it('al guardar caduca la caché de las checklists', async () => {
    expect(ChecklistsIndex.hooks?.afterChange).toHaveLength(1)
    await ChecklistsIndex.hooks!.afterChange![0]!({ doc: { id: 1 } } as never)
    expect(revalidateTag).toHaveBeenCalledWith(CHECKLISTS_TAG, { expire: 0 })
  })
})
