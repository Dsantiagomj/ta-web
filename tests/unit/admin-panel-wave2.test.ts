import { readFileSync } from 'node:fs'
import type { CollectionConfig, Field, RowField, TabsField } from 'payload'
import { describe, expect, it } from 'vitest'

import { AchievementGroups } from '@/collections/AchievementGroups'
import { AchievementPages } from '@/collections/AchievementPages'
import { Checklists } from '@/collections/Checklists'
import { DofusGuides } from '@/collections/DofusGuides'
import { QuestGuides } from '@/collections/QuestGuides'

import { layoutFields } from './helpers/fields'

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

/** Las pestañas de un formulario: su etiqueta y los campos de datos de cada una. */
function tabsOf(fields: Field[]): { label: string; names: string[] }[] {
  const tabs = fields.find((candidate) => candidate.type === 'tabs')
  if (!tabs || tabs.type !== 'tabs') return []
  return tabs.tabs.map((tab) => {
    // Sin nombre: los datos se guardan igual que sin pestañas, sin migración.
    expect('name' in tab && tab.name, String(tab.label)).toBeFalsy()
    const names = layoutFields(tab.fields).flatMap((f) => ('name' in f ? [f.name] : []))
    return { label: String(tab.label), names }
  })
}

describe('A-22: pestañas en los formularios largos', () => {
  it('la guía de Dofus: Contenido, Ficha y Necesitarás', () => {
    expect(tabsOf(DofusGuides.fields)).toEqual([
      { label: 'Contenido', names: ['intro', 'parts', 'body', 'outro'] },
      {
        label: 'Ficha',
        names: [
          'level',
          'tag',
          'color',
          'aliases',
          'prerequisites',
          'rewards',
          'checklist',
          'video',
          'videoPoster',
        ],
      },
      { label: 'Necesitarás', names: ['needs'] },
    ])
  })

  it('el Dofus y el nombre quedan fuera de las pestañas, siempre a la vista', () => {
    const above = DofusGuides.fields
      .filter((candidate) => adminOf(candidate).position !== 'sidebar')
      .filter((candidate) => candidate.type !== 'tabs' && !adminOf(candidate).hidden)
      .map((candidate) => ('name' in candidate ? candidate.name : candidate.type))
    expect(above).toEqual(['dofus', 'name'])
  })

  it('la ficha pone nivel, etiqueta y color en una fila, y el color se elige con un selector', () => {
    const ficha = (DofusGuides.fields.find((f) => f.type === 'tabs') as TabsField).tabs[1]!
    const row = ficha.fields[0]
    expect(row?.type).toBe('row')
    const color = (row as RowField).fields.find((f) => 'name' in f && f.name === 'color')
    expect(adminOf(color!).components).toMatchObject({
      Field: '/components/admin/ColorField#ColorField',
      beforeInput: ['/components/admin/ColorField#ColorSwatch'],
    })
    expect(adminOf(color!).className).toBe('ta-color')
  })

  it('la guía de misión: Contenido, Resumen y SEO', () => {
    expect(tabsOf(QuestGuides.fields)).toEqual([
      { label: 'Contenido', names: ['body'] },
      { label: 'Resumen', names: ['summary'] },
      { label: 'SEO', names: ['seo'] },
    ])
  })

  it('el logro: Misiones, Texto y Recompensas', () => {
    expect(tabsOf(AchievementPages.fields)).toEqual([
      { label: 'Misiones', names: ['group', 'order', 'quests'] },
      { label: 'Texto', names: ['intro', 'outro'] },
      { label: 'Recompensas', names: ['points', 'rewards'] },
    ])
  })

  it('la checklist se queda como está (otro agente la reorganiza)', () => {
    expect(tabsOf(Checklists.fields)).toEqual([])
  })
})

describe('A-22: las pestañas con error se leen', () => {
  const scss = readFileSync('src/app/(payload)/custom.scss', 'utf8')
  /** Las reglas de custom.scss sobre los botones de pestaña: selector y cuerpo. */
  const tabRules = [...scss.matchAll(/([^{}]*tabs-field__tab-button[^{}]*)\{([^}]*)\}/g)].map(
    ([, selector, body]) => ({ selector: selector!.replace(/\s+/g, ' ').trim(), body: body! }),
  )

  it('una pestaña sin elegir, con error o sin él, no se aclara con opacidad', () => {
    const inactive = tabRules.find(
      (rule) =>
        rule.selector.includes(':not(.tabs-field__tab-button--active)') &&
        /opacity:\s*1/.test(rule.body),
    )
    expect(inactive?.selector).toBeDefined()
    expect(inactive?.selector).not.toContain('has-error')
  })

  it('al pasar el ratón, una pestaña con error conserva su color', () => {
    const hover = tabRules.find((rule) => rule.selector.includes(':hover'))
    expect(hover?.selector.replace(/\s+/g, '')).toMatch(/:not\([^)]*tab-button--has-error[^)]*\)/)
  })
})
