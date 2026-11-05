import { afterEach, describe, expect, it, vi } from 'vitest'

const revalidateTag = vi.hoisted(() => vi.fn())
vi.mock('next/cache', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/cache')>()),
  revalidateTag,
}))

import { Media } from '@/collections/Media'
import { QuestGuides } from '@/collections/QuestGuides'
import { revalidateGuidePages } from '@/collections/revalidate-guides'
import { GUIDE_PAGES_TAG } from '@/lib/guides/cache'

afterEach(() => revalidateTag.mockReset())

describe('revalidateGuidePages', () => {
  it('marca caducadas las guías en caché: la siguiente visita ya lee lo publicado', () => {
    revalidateGuidePages()
    expect(revalidateTag).toHaveBeenCalledWith(GUIDE_PAGES_TAG, { expire: 0 })
  })

  it('fuera de Next (importación, scripts, pruebas) no falla: no hay caché que tocar', async () => {
    const actual = await vi.importActual<typeof import('next/cache')>('next/cache')
    revalidateTag.mockImplementation(actual.revalidateTag)
    expect(() => revalidateGuidePages()).not.toThrow()
  })

  it('cualquier otro error sí sale', () => {
    revalidateTag.mockImplementation(() => {
      throw new Error('otra cosa')
    })
    expect(() => revalidateGuidePages()).toThrow('otra cosa')
  })
})

describe('hooks de revalidación', () => {
  const hookArgs = { doc: { id: 1 } } as never

  it('una guía guardada, publicada o borrada revalida las páginas de guía', async () => {
    for (const hook of [
      ...(QuestGuides.hooks?.afterChange ?? []),
      ...(QuestGuides.hooks?.afterDelete ?? []),
    ]) {
      revalidateTag.mockReset()
      expect(await hook(hookArgs)).toEqual({ id: 1 })
      expect(revalidateTag).toHaveBeenCalledWith(GUIDE_PAGES_TAG, { expire: 0 })
    }
    expect(QuestGuides.hooks?.afterChange).toHaveLength(1)
    expect(QuestGuides.hooks?.afterDelete).toHaveLength(1)
  })

  it('un archivo de media cambiado también: su texto alternativo sale en las guías', async () => {
    expect(Media.hooks?.afterChange).toHaveLength(1)
    expect(Media.hooks?.afterDelete).toHaveLength(1)
    await Media.hooks?.afterChange?.[0](hookArgs)
    expect(revalidateTag).toHaveBeenCalledWith(GUIDE_PAGES_TAG, { expire: 0 })
  })
})
