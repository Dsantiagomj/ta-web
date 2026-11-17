import type { CollectionConfig, Field } from 'payload'
import { describe, expect, it } from 'vitest'

import { AchievementPages } from '@/collections/AchievementPages'
import { REFERRERS } from '@/collections/delete-guard'
import { QuestGuides } from '@/collections/QuestGuides'

function topField(collection: CollectionConfig, name: string): Field | undefined {
  return collection.fields.find((field) => 'name' in field && field.name === name)
}

describe('el fondo propio de una página', () => {
  it.each([
    ['quest-guides', QuestGuides],
    ['achievement-pages', AchievementPages],
  ])('%s tiene una imagen opcional en la barra lateral', (_slug, collection) => {
    expect(topField(collection, 'background')).toMatchObject({
      type: 'upload',
      relationTo: 'media',
      admin: { position: 'sidebar' },
    })
    expect(topField(collection, 'background')).not.toHaveProperty('required', true)
  })

  it('una imagen de fondo en uso no se borra', () => {
    const paths = (collection: string) =>
      REFERRERS.media
        .filter((referrer) => referrer.collection === collection)
        .flatMap((r) => r.paths)
    expect(paths('quest-guides')).toContain('background')
    expect(paths('achievement-pages')).toContain('background')
    expect(paths('subareas')).toContain('background')
  })
})
