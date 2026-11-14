import config from '@payload-config'
import type { SanitizedConfig } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { collectionDescriptions, panelGuide } from '@/lib/admin/panel-guide'

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
      '/components/admin/PanelGuide#PanelGuideNavLink',
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

  it('no sobra ninguna: cada descripción es de una colección que existe', () => {
    const slugs = visible().map((collection) => collection.slug)
    expect(Object.keys(collectionDescriptions).sort()).toEqual([...slugs].sort())
  })
})
