import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  AchievementCountsFor,
  AchievementHeader,
  AchievementNav,
  AchievementQuests,
} from '@/components/achievement/AchievementParts'
import { Breadcrumb } from '@/components/site/Breadcrumb'
import type { AchievementPageView } from '@/lib/achievements/page'

const html = (node: React.ReactNode) => renderToStaticMarkup(node)
const icon = { src: '/img/logro-203.webp', width: 58, height: 58 }

describe('Breadcrumb', () => {
  const crumbs = {
    parents: [
      { name: 'Metalogros', href: 'https://www.torrentearcano.com/metalogros' },
      { name: 'Astrub', href: 'https://www.torrentearcano.com/metalogro-astrub' },
    ],
    jsonLd: {
      '@context': 'https://schema.org' as const,
      '@type': 'BreadcrumbList' as const,
      itemListElement: [
        {
          '@type': 'ListItem' as const,
          position: 1,
          name: 'Metalogros',
          item: 'https://x/metalogros',
        },
      ],
    },
  }

  it('es una navegación con lista, solo los padres, con el JSON-LD', () => {
    const markup = html(<Breadcrumb {...crumbs} />)
    expect(markup).toMatch(/^<nav class="crumbs" aria-label="Ruta de navegación"><ol role="list">/)
    expect(markup.match(/<li>/g)).toHaveLength(2)
    expect(markup).toContain('href="https://www.torrentearcano.com/metalogro-astrub"')
    expect(markup).toContain('<script type="application/ld+json">')
  })

  it('el padre directo lleva el chevron del móvil; el JSON-LD no puede cerrar el script', () => {
    const markup = html(
      <Breadcrumb
        {...crumbs}
        jsonLd={{
          ...crumbs.jsonLd,
          itemListElement: [{ '@type': 'ListItem', position: 1, name: '</script>', item: 'x' }],
        }}
      />,
    )
    expect(markup.match(/crumbs__chev/g)).toHaveLength(1)
    expect(markup).not.toContain('</script></script>')
    expect(markup).toContain('\\u003c/script>')
  })
})

describe('AchievementHeader', () => {
  it('el icono del logro, el título, el subtítulo y las columnas con sus títulos', () => {
    const markup = html(
      <AchievementHeader
        title="La ocasión hace al ladrón"
        icon={icon}
        meta={['3 misiones', 'Niveles 15 a 25', '10 puntos']}
        facts={{
          prerequisites: [],
          needs: { items: [], notes: [{ quantity: 3, label: 'Combate (solo)', combat: true }] },
          rewards: { xp: { max: 102_128 }, kamas: 1_105, items: [], notes: [] },
        }}
      />,
    )
    expect(markup).toContain('<h1 class="qhead__title">La ocasión hace al ladrón</h1>')
    expect(markup).toContain('3 misiones - Niveles 15 a 25 - 10 puntos')
    expect(markup).toContain('Necesitarás en total')
    expect(markup).toContain('Recompensas del logro')
    expect(markup).toContain('src="/img/logro-203.webp"')
  })
})

describe('AchievementQuests', () => {
  it('toda la tarjeta abre la guía; sin guía, sin enlace', () => {
    const markup = html(
      <AchievementQuests
        quests={[
          { position: 1, level: 15, title: 'Esto hace aguas', href: '/esto-hace-aguas' },
          { position: 3, level: 25, title: 'El cazador cazado' },
        ]}
      />,
    )
    expect(markup).toContain('Las misiones, en orden')
    expect(markup).toContain('Misión 1 - Nivel 15')
    expect(markup.match(/<a /g)).toHaveLength(1)
    expect(markup).toContain('<a href="/esto-hace-aguas">Esto hace aguas</a>')
    expect(markup).toContain('El cazador cazado')
    // Sin progreso: ni casillas ni «Te toca».
    expect(markup).not.toMatch(/checkbox|Te toca/)
  })
})

const items: NonNullable<AchievementPageView['group']>['items'] = [
  {
    name: 'Un ciudadano modelo',
    href: '/un-ciudadano-modelo',
    current: false,
    disabled: false,
    quests: 6,
    levels: 'Niveles 15 a 30',
  },
  { name: 'La ocasión hace al ladrón', current: true, disabled: false, quests: 3 },
  { name: 'La gran biblioteca', current: false, disabled: true, quests: 4 },
]

describe('AchievementCountsFor', () => {
  it('cuenta para: los logros del juego que lo piden, sin la lista del metalogro', () => {
    const markup = html(
      <AchievementCountsFor
        countsFor={[{ name: 'Periplo astrubiense', points: 20, achievements: 6 }]}
      />,
    )
    expect(markup).toContain('Cuenta para')
    expect(markup).toContain('Periplo astrubiense')
    expect(markup).toContain('Pide 6 logros.')
    expect(markup).toContain('<b>20</b> puntos')
    expect(markup).not.toContain('<aside')
    expect(markup).not.toContain('Metalogro')
  })

  it('sin metalogros que lo pidan, no pinta nada', () => {
    expect(html(<AchievementCountsFor countsFor={[]} />)).toBe('')
  })
})

describe('AchievementNav', () => {
  it('el anterior es un enlace; el siguiente, en preparación, no', () => {
    const markup = html(<AchievementNav group="Astrub" previous={items[0]!} next={items[2]!} />)
    expect(markup).toContain('aria-label="Logros de Astrub"')
    expect(markup).toContain('Logro anterior')
    expect(markup).toContain('href="/un-ciudadano-modelo"')
    expect(markup.match(/<a /g)).toHaveLength(1)
    expect(markup).toMatch(/aria-disabled="true"[\s\S]*La gran biblioteca/)
  })

  it('sin anterior ni siguiente, nada', () => {
    expect(html(<AchievementNav group="Astrub" previous={null} next={null} />)).toBe('')
  })
})
