import type { Field } from 'payload'
import { afterEach, describe, expect, it, vi } from 'vitest'

const revalidateTag = vi.hoisted(() => vi.fn())
vi.mock('next/cache', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/cache')>()),
  revalidateTag,
}))

import { isPanelUser } from '@/collections/editorial-access'
import { DofusGuidesIndex } from '@/globals/DofusGuidesIndex'
import { DOFUS_GUIDES_TAG } from '@/lib/dofus-guides/cache'

afterEach(() => revalidateTag.mockReset())

const field = (name: string) =>
  DofusGuidesIndex.fields.find((candidate: Field) => 'name' in candidate && candidate.name === name)

// La entradilla del índice /guias-dofus es de Torre: la cambia en el panel, no en el código.
describe('global dofus-guides-index', () => {
  it('va con las guías y la edita Torre; la lee cualquiera', () => {
    expect(DofusGuidesIndex.slug).toBe('dofus-guides-index')
    expect(DofusGuidesIndex.admin).toMatchObject({ group: 'Contenido' })
    expect(DofusGuidesIndex.access?.update).toBe(isPanelUser)
    expect((DofusGuidesIndex.access?.read as () => boolean)()).toBe(true)
  })

  it('guarda la entradilla como texto con enlaces', () => {
    expect(field('intro')).toMatchObject({ type: 'richText', localized: true })
  })

  it('al guardar caduca la caché de las guías de Dofus', async () => {
    expect(DofusGuidesIndex.hooks?.afterChange).toHaveLength(1)
    await DofusGuidesIndex.hooks!.afterChange![0]!({ doc: { id: 1 } } as never)
    expect(revalidateTag).toHaveBeenCalledWith(DOFUS_GUIDES_TAG, { expire: 0 })
  })
})
