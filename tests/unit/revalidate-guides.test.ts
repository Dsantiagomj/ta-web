import { afterEach, describe, expect, it, vi } from 'vitest'

const revalidateTag = vi.hoisted(() => vi.fn())
vi.mock('next/cache', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/cache')>()),
  revalidateTag,
}))

import { AchievementGroups } from '@/collections/AchievementGroups'
import { AchievementPages } from '@/collections/AchievementPages'
import { Checklists } from '@/collections/Checklists'
import { DofusGuides } from '@/collections/DofusGuides'
import { Media } from '@/collections/Media'
import { Pages } from '@/collections/Pages'
import { QuestGuides } from '@/collections/QuestGuides'
import { revalidateGuidePages } from '@/collections/revalidate-guides'
import { isSlugMoveHook } from '@/collections/slug-redirects'
import { ACHIEVEMENT_PAGES_TAG } from '@/lib/achievements/cache'
import { CHECKLISTS_TAG } from '@/lib/checklists/cache'
import { DOFUS_GUIDES_TAG } from '@/lib/dofus-guides/cache'
import { GUIDE_PAGES_TAG } from '@/lib/guides/cache'
import { PAGES_TAG } from '@/lib/pages/cache'

afterEach(() => revalidateTag.mockReset())

/** Los hooks afterChange que revalidan: sin el que guarda las redirecciones de slug. */
const own = <T extends object>(hooks: T[] = []) => hooks.filter((hook) => !isSlugMoveHook(hook))

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
      ...own(QuestGuides.hooks?.afterChange),
      ...(QuestGuides.hooks?.afterDelete ?? []),
    ]) {
      revalidateTag.mockReset()
      expect(await hook(hookArgs)).toEqual({ id: 1 })
      expect(revalidateTag).toHaveBeenCalledWith(GUIDE_PAGES_TAG, { expire: 0 })
    }
    expect(own(QuestGuides.hooks?.afterChange)).toHaveLength(1)
    expect(QuestGuides.hooks?.afterDelete).toHaveLength(1)
  })

  it('un archivo de media cambiado también: su texto alternativo sale en las guías', async () => {
    expect(own(Media.hooks?.afterChange)).toHaveLength(1)
    expect(Media.hooks?.afterDelete).toHaveLength(1)
    await Media.hooks?.afterChange?.[0](hookArgs)
    expect(revalidateTag).toHaveBeenCalledWith(GUIDE_PAGES_TAG, { expire: 0 })
  })
})

describe('páginas de logro', () => {
  const hookArgs = { doc: { id: 1 } } as never

  it('una guía o un archivo cambiados también caducan las páginas de logro: las enlazan', async () => {
    await QuestGuides.hooks?.afterChange?.[0](hookArgs)
    expect(revalidateTag).toHaveBeenCalledWith(ACHIEVEMENT_PAGES_TAG, { expire: 0 })
    revalidateTag.mockReset()
    await Media.hooks?.afterDelete?.[0](hookArgs)
    expect(revalidateTag).toHaveBeenCalledWith(ACHIEVEMENT_PAGES_TAG, { expire: 0 })
  })

  it.each([
    ['achievement-pages', AchievementPages],
    ['achievement-groups', AchievementGroups],
  ])(
    '%s guardado o borrado caduca las páginas de logro y las guías, por sus migas',
    async (_, collection) => {
      for (const hook of [
        ...own(collection.hooks?.afterChange),
        ...(collection.hooks?.afterDelete ?? []),
      ]) {
        revalidateTag.mockReset()
        expect(await hook(hookArgs)).toEqual({ id: 1 })
        expect(revalidateTag).toHaveBeenCalledWith(ACHIEVEMENT_PAGES_TAG, { expire: 0 })
        expect(revalidateTag).toHaveBeenCalledWith(GUIDE_PAGES_TAG, { expire: 0 })
      }
      expect(own(collection.hooks?.afterChange)).toHaveLength(1)
      expect(collection.hooks?.afterDelete).toHaveLength(1)
    },
  )
})

describe('guías de Dofus', () => {
  const hookArgs = { doc: { id: 1 } } as never

  it('una guía de Dofus guardada o borrada caduca su caché y la de las guías: el menú la lista', async () => {
    for (const hook of [
      ...own(DofusGuides.hooks?.afterChange),
      ...(DofusGuides.hooks?.afterDelete ?? []),
    ]) {
      revalidateTag.mockReset()
      expect(await hook(hookArgs)).toEqual({ id: 1 })
      expect(revalidateTag).toHaveBeenCalledWith(DOFUS_GUIDES_TAG, { expire: 0 })
      expect(revalidateTag).toHaveBeenCalledWith(GUIDE_PAGES_TAG, { expire: 0 })
    }
    expect(own(DofusGuides.hooks?.afterChange)).toHaveLength(1)
    expect(DofusGuides.hooks?.afterDelete).toHaveLength(1)
  })

  it.each([
    ['quest-guides', QuestGuides],
    ['achievement-pages', AchievementPages],
    ['achievement-groups', AchievementGroups],
    ['media', Media],
  ])('%s guardado o borrado caduca las guías de Dofus: las muestran', async (_, collection) => {
    for (const hook of [
      ...own(collection.hooks?.afterChange),
      ...(collection.hooks?.afterDelete ?? []),
    ]) {
      revalidateTag.mockReset()
      await hook(hookArgs)
      expect(revalidateTag).toHaveBeenCalledWith(DOFUS_GUIDES_TAG, { expire: 0 })
    }
  })
})

describe('checklists', () => {
  const hookArgs = { doc: { id: 1 } } as never

  it('una checklist guardada, publicada o borrada caduca su caché', async () => {
    expect(CHECKLISTS_TAG).toBe('checklists')
    for (const hook of [
      ...own(Checklists.hooks?.afterChange),
      ...(Checklists.hooks?.afterDelete ?? []),
    ]) {
      revalidateTag.mockReset()
      expect(await hook(hookArgs)).toEqual({ id: 1 })
      expect(revalidateTag).toHaveBeenCalledWith(CHECKLISTS_TAG, { expire: 0 })
      // La guía de su Dofus enlaza la checklist publicada en la web: cambia con ella.
      expect(revalidateTag).toHaveBeenCalledWith(DOFUS_GUIDES_TAG, { expire: 0 })
    }
    expect(own(Checklists.hooks?.afterChange)).toHaveLength(1)
    expect(Checklists.hooks?.afterDelete).toHaveLength(1)
  })

  it.each([
    ['quest-guides', QuestGuides],
    ['achievement-pages', AchievementPages],
    ['dofus-guides', DofusGuides],
    ['media', Media],
  ])('%s guardado o borrado caduca las checklists: su página lo enseña', async (_, collection) => {
    const hooks = [...own(collection.hooks?.afterChange), ...(collection.hooks?.afterDelete ?? [])]
    expect(hooks.length).toBeGreaterThan(0)
    for (const hook of hooks) {
      revalidateTag.mockReset()
      expect(await hook(hookArgs)).toEqual({ id: 1 })
      expect(revalidateTag).toHaveBeenCalledWith(CHECKLISTS_TAG, { expire: 0 })
    }
  })
})

describe('pages', () => {
  const hookArgs = { doc: { id: 1 } } as never

  it('una página guardada, publicada o borrada caduca su caché', async () => {
    expect(PAGES_TAG).toBe('pages')
    for (const hook of [...own(Pages.hooks?.afterChange), ...(Pages.hooks?.afterDelete ?? [])]) {
      revalidateTag.mockReset()
      expect(await hook(hookArgs)).toEqual({ id: 1 })
      expect(revalidateTag).toHaveBeenCalledWith(PAGES_TAG, { expire: 0 })
    }
  })

  it('una imagen guardada o borrada caduca las páginas: salen en su cuerpo', async () => {
    for (const hook of [...own(Media.hooks?.afterChange), ...(Media.hooks?.afterDelete ?? [])]) {
      revalidateTag.mockReset()
      await hook(hookArgs)
      expect(revalidateTag).toHaveBeenCalledWith(PAGES_TAG, { expire: 0 })
    }
  })
})
