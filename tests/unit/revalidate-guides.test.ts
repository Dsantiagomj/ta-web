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
import { QuestGuides } from '@/collections/QuestGuides'
import { Quests } from '@/collections/Quests'
import { revalidateGuidePages } from '@/collections/revalidate-guides'
import { ACHIEVEMENT_PAGES_TAG } from '@/lib/achievements/cache'
import { CHECKLISTS_TAG } from '@/lib/checklists/cache'
import { DOFUS_GUIDES_TAG } from '@/lib/dofus-guides/cache'
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
        ...(collection.hooks?.afterChange ?? []),
        ...(collection.hooks?.afterDelete ?? []),
      ]) {
        revalidateTag.mockReset()
        expect(await hook(hookArgs)).toEqual({ id: 1 })
        expect(revalidateTag).toHaveBeenCalledWith(ACHIEVEMENT_PAGES_TAG, { expire: 0 })
        expect(revalidateTag).toHaveBeenCalledWith(GUIDE_PAGES_TAG, { expire: 0 })
      }
      expect(collection.hooks?.afterChange).toHaveLength(1)
      expect(collection.hooks?.afterDelete).toHaveLength(1)
    },
  )
})

describe('guías de Dofus', () => {
  const hookArgs = { doc: { id: 1 } } as never

  it('una guía de Dofus guardada o borrada caduca su caché y la de las guías: el menú la lista', async () => {
    for (const hook of [
      ...(DofusGuides.hooks?.afterChange ?? []),
      ...(DofusGuides.hooks?.afterDelete ?? []),
    ]) {
      revalidateTag.mockReset()
      expect(await hook(hookArgs)).toEqual({ id: 1 })
      expect(revalidateTag).toHaveBeenCalledWith(DOFUS_GUIDES_TAG, { expire: 0 })
      expect(revalidateTag).toHaveBeenCalledWith(GUIDE_PAGES_TAG, { expire: 0 })
    }
    expect(DofusGuides.hooks?.afterChange).toHaveLength(1)
    expect(DofusGuides.hooks?.afterDelete).toHaveLength(1)
  })

  it.each([
    ['quest-guides', QuestGuides],
    ['achievement-pages', AchievementPages],
    ['achievement-groups', AchievementGroups],
    ['media', Media],
  ])('%s guardado o borrado caduca las guías de Dofus: las muestran', async (_, collection) => {
    for (const hook of [
      ...(collection.hooks?.afterChange ?? []),
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
      ...(Checklists.hooks?.afterChange ?? []),
      ...(Checklists.hooks?.afterDelete ?? []),
    ]) {
      revalidateTag.mockReset()
      expect(await hook(hookArgs)).toEqual({ id: 1 })
      expect(revalidateTag).toHaveBeenCalledWith(CHECKLISTS_TAG, { expire: 0 })
    }
    expect(Checklists.hooks?.afterChange).toHaveLength(1)
    expect(Checklists.hooks?.afterDelete).toHaveLength(1)
  })

  it.each([
    ['quests', Quests],
    ['quest-guides', QuestGuides],
    ['achievement-pages', AchievementPages],
    ['dofus-guides', DofusGuides],
    ['media', Media],
  ])('%s guardado o borrado caduca las checklists: su página lo enseña', async (_, collection) => {
    const hooks = [
      ...(collection.hooks?.afterChange ?? []),
      ...(collection.hooks?.afterDelete ?? []),
    ]
    expect(hooks.length).toBeGreaterThan(0)
    for (const hook of hooks) {
      revalidateTag.mockReset()
      expect(await hook(hookArgs)).toEqual({ id: 1 })
      expect(revalidateTag).toHaveBeenCalledWith(CHECKLISTS_TAG, { expire: 0 })
    }
  })
})
