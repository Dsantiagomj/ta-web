import type { CollectionConfig, Field } from 'payload'
import { describe, expect, it } from 'vitest'

import { AchievementGroups } from '@/collections/AchievementGroups'
import { AchievementPages } from '@/collections/AchievementPages'
import { Checklists } from '@/collections/Checklists'
import { DofusGuides } from '@/collections/DofusGuides'
import { QuestGuides } from '@/collections/QuestGuides'

// El panel para Torre, ola 2 (docs/research/backlog.md, A-13 a A-22): lo que se configura en
// las colecciones, sin cambiar quién puede hacer qué.

type Admin = Record<string, unknown> & { components?: Record<string, unknown> }
const adminOf = (target: { admin?: unknown }) => (target.admin ?? {}) as Admin

const EDITORIAL: CollectionConfig[] = [
  QuestGuides,
  AchievementPages,
  AchievementGroups,
  DofusGuides,
  Checklists,
]

/** Los campos de la barra lateral, en el orden en que salen. */
function sidebar(fields: Field[]): Field[] {
  return fields.flatMap((candidate) => {
    if (candidate.type === 'row' || candidate.type === 'collapsible') {
      return sidebar(candidate.fields)
    }
    if (candidate.type === 'tabs') {
      return candidate.tabs.flatMap((tab) => sidebar(tab.fields))
    }
    return adminOf(candidate).position === 'sidebar' ? [candidate] : []
  })
}

describe('A-16: el estado de publicación en palabras claras', () => {
  it('cada colección de Torre abre la barra lateral con una línea que dice qué se ve', () => {
    for (const collection of EDITORIAL) {
      const first = sidebar(collection.fields)[0]
      expect(first, collection.slug).toMatchObject({
        type: 'ui',
        name: 'publishStatus',
        admin: {
          position: 'sidebar',
          components: { Field: '/components/admin/PublishStatus#PublishStatus' },
        },
      })
    }
  })
})

describe('A-20: los tamaños de la vista previa', () => {
  it('móvil, tableta y escritorio, en las colecciones con página', () => {
    for (const collection of EDITORIAL.filter((c) => c !== AchievementGroups)) {
      const livePreview = adminOf(collection).livePreview as { breakpoints?: unknown }
      expect(livePreview?.breakpoints, collection.slug).toEqual([
        { name: 'movil', label: 'Móvil', width: 390, height: 844 },
        { name: 'tableta', label: 'Tableta', width: 1024, height: 768 },
        { name: 'escritorio', label: 'Escritorio', width: 1440, height: 900 },
      ])
    }
  })

  it('las checklists abren su página en la vista previa', () => {
    const livePreview = adminOf(Checklists).livePreview as {
      url: (args: { data: { slug: string }; req: { origin: string } }) => string
    }
    expect(
      livePreview.url({ data: { slug: 'nebuloso' }, req: { origin: 'https://x.test' } }),
    ).toMatch(/\/vista-previa\?slug=nebuloso$/)
  })
})
