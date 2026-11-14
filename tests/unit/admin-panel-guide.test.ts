import config from '@payload-config'
import type { SanitizedConfig } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { preparingOnSite } from '@/lib/admin/panel-guide'
import { panelStrings, SITE_HOST } from '@/lib/admin/strings'

const panelGuide = panelStrings.guide
const collectionDescriptions = panelStrings.collections

// A-14 (docs/research/backlog.md): la «Guía del panel», una vista propia con secciones
// cortas, y una línea de descripción en cada colección.

let sanitized: SanitizedConfig
beforeAll(async () => {
  sanitized = await config
})

const allText = () =>
  [
    panelGuide.intro,
    ...panelGuide.sections.flatMap((section) => [section.title, ...section.paragraphs]),
  ].join('\n')

describe('la guía del panel', () => {
  it('tiene de seis a ocho secciones cortas, cada una con su ancla', () => {
    expect(panelGuide.sections.length).toBeGreaterThanOrEqual(6)
    expect(panelGuide.sections.length).toBeLessThanOrEqual(8)
    const ids = panelGuide.sections.map((section) => section.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const section of panelGuide.sections) {
      expect(section.id, section.title).toMatch(/^[a-z0-9-]+$/)
      expect(section.paragraphs.length, section.title).toBeGreaterThan(0)
      expect(section.paragraphs.length, section.title).toBeLessThanOrEqual(5)
    }
  })

  it('cubre borradores, publicar, En preparación, DofusDB, imágenes y versiones', () => {
    const text = allText()
    for (const topic of [
      'Guardar borrador',
      'Publicar cambios',
      'En preparación',
      'DofusDB',
      'texto alternativo',
      'Versiones',
      'Restaurar esta versión',
    ]) {
      expect(text, topic).toContain(topic)
    }
  })

  it('dice qué puede hacer cada cuenta, con los papeles del panel (A-15)', () => {
    const text = allText()
    expect(text).toContain('Editor')
    expect(text).toContain('Administrador')
    expect(text).toMatch(/borrar/i)
    expect(panelGuide.yourRole('admin')).toBe('Tu cuenta es de administrador.')
    expect(panelGuide.yourRole('editor')).toBe('Tu cuenta es de editor.')
    expect(panelGuide.yourRole(null)).toBe('Tu cuenta es de editor.')
  })

  it('«En preparación» se explica caso por caso, como la línea «En la web»', () => {
    expect(preparingOnSite()).toEqual([
      'Un logro: sale apagado, sin página.',
      'Un metalogro: se abre solo si tiene logros publicados.',
      'Una guía de Dofus: el huevo sale apagado, sin página.',
      'Una checklist con dirección en la web antigua: en el menú, lleva a la checklist de ' +
        'Squarespace.',
      'Una checklist sin ella: en el menú, apagada y sin enlace.',
    ])
  })

  it('la dirección de ejemplo usa el dominio del sitio', () => {
    expect(allText()).toContain(`${SITE_HOST}/aprendizaje-escudero`)
  })

  it('«Guía del panel» se escribe en un solo sitio', () => {
    expect(panelGuide.title).toBe('Guía del panel')
    expect(Object.keys(panelGuide)).not.toContain('navLink')
  })

  it('habla de tú, sin usted ni jerga', () => {
    expect(allText()).not.toMatch(/\b(usted|desea|slug|draft|publish|deploy|endpoint)\b/i)
  })

  it('la vista va en /admin/guia', () => {
    const views = sanitized.admin.components?.views as Record<
      string,
      { path?: string; Component?: unknown }
    >
    expect(views.panelGuide).toMatchObject({
      path: '/guia',
      Component: '/components/admin/PanelGuide#PanelGuide',
    })
  })

  it('el menú lleva a la guía', () => {
    expect(sanitized.admin.components?.afterNavLinks).toContain(
      '/components/admin/PanelGuideNavLink#PanelGuideNavLink',
    )
  })
})

describe('una línea de descripción por colección', () => {
  const visible = () =>
    sanitized.collections.filter((collection) => !collection.slug.startsWith('payload-'))

  it('cada colección del panel tiene la suya, en una línea', () => {
    for (const collection of visible()) {
      const description = collection.admin.description
      expect(description, collection.slug).toBe(
        collectionDescriptions[collection.slug as keyof typeof collectionDescriptions],
      )
      expect(typeof description, collection.slug).toBe('string')
      expect(description as string, collection.slug).not.toContain('\n')
      expect((description as string).length, collection.slug).toBeLessThanOrEqual(140)
    }
  })

  it('las de los datos del juego dicen que son de solo lectura', () => {
    for (const slug of [
      'quests',
      'items',
      'monsters',
      'dungeons',
      'npcs',
      'subareas',
      'achievement-categories',
      'achievements',
    ] as const) {
      expect(collectionDescriptions[slug], slug).toContain('De solo lectura')
    }
  })

  it('no sobra ninguna: cada descripción es de una colección que existe', () => {
    const slugs = visible().map((collection) => collection.slug)
    expect(Object.keys(collectionDescriptions).sort()).toEqual([...slugs].sort())
  })
})
