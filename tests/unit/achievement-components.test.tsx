import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  AchievementCountsFor,
  AchievementHeader,
  AchievementNav,
  AchievementNeeds,
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
  it('el icono, el título, el subtítulo y la banda de Prerrequisitos y Recompensas', () => {
    const markup = html(
      <AchievementHeader
        title="La ocasión hace al ladrón"
        icon={icon}
        meta={['3 misiones', 'Niveles 15 a 25', '10 puntos']}
        facts={{
          prerequisites: [{ label: 'Archi y sus principios', quest: true }],
          rewards: { xp: { max: 102_128 }, kamas: 1_105, items: [], notes: [] },
        }}
      />,
    )
    expect(markup).toContain('<h1 class="qhead__title">La ocasión hace al ladrón</h1>')
    expect(markup).toContain('3 misiones - Niveles 15 a 25 - 10 puntos')
    expect(markup).toContain('Prerrequisitos')
    expect(markup).toContain('Recompensas del logro')
    // «Necesitarás en total» es su propia zona, fuera de la cabecera.
    expect(markup).not.toContain('Necesitarás')
    expect(markup).toContain('src="/img/logro-203.webp"')
  })
})

describe('AchievementNeeds', () => {
  const text = (markup: string) => markup.replace(/<[^>]+>/g, '')
  const needs = {
    items: [
      { item: { name: 'Piedra de alma mediana', icon }, quantity: 1 },
      { item: { name: 'Llave de la Fábrica de Malefíscof' } },
    ],
    tasks: [
      { quantity: 3, label: 'Combates realizables en grupo', kind: 'combat' as const },
      { quantity: 1, label: 'Mazmorra Malefíscof', kind: 'dungeon' as const },
    ],
    others: [{ label: 'Hechizo Captura de almas' }, { label: '1 kama' }],
  }

  it('su propia zona, con tres grupos con título: Objetos, Combates y mazmorras, y Otros', () => {
    const markup = html(<AchievementNeeds needs={needs} />)
    expect(markup).toContain('<section class="lneeds" aria-labelledby="logro-necesitas">')
    expect(markup).toContain('<h2 class="lzone__h" id="logro-necesitas">Necesitarás en total</h2>')
    const groups = [...markup.matchAll(/<h3 class="lneeds__k" id="([^"]+)">([^<]+)<\/h3>/g)]
    expect(groups.map((group) => group[2])).toEqual(['Objetos', 'Combates y mazmorras', 'Otros'])
    // Cada lista se llama como su grupo.
    for (const [, id] of groups) expect(markup).toContain(`aria-labelledby="${id}"`)
  })

  it('los objetos con su icono, cantidad y nombre que se copia; sin cantidad, solo el nombre', () => {
    const markup = html(<AchievementNeeds needs={needs} />)
    expect(markup).toContain('data-copy="Piedra de alma mediana"')
    expect(markup).toContain('data-copy="Llave de la Fábrica de Malefíscof"')
    expect(text(markup)).toContain('1 × Piedra de alma mediana')
    expect(text(markup)).not.toContain('× Llave')
  })

  it('combates con su icono, la mazmorra con el de mazmorra; los otros, tal cual', () => {
    const markup = html(<AchievementNeeds needs={needs} />)
    expect(markup).toContain('src="/img/game/combate.webp"')
    expect(markup).toContain('src="/img/game/jefes/crunchidor.webp"')
    expect(text(markup)).toContain('3 × Combates realizables en grupo')
    expect(text(markup)).toContain('1 × Mazmorra Malefíscof')
    expect(text(markup)).toContain('Hechizo Captura de almas')
    expect(text(markup)).toContain('1 kama')
    // Las notas no copian nada.
    expect(markup).not.toContain('data-copy="Hechizo')
  })

  it('un grupo vacío no se pinta; sin nada, no hay zona', () => {
    const markup = html(<AchievementNeeds needs={{ ...needs, others: [] }} />)
    expect(markup).not.toContain('Otros')
    expect(html(<AchievementNeeds needs={{ items: [], tasks: [], others: [] }} />)).toBe('')
  })
})

describe('AchievementQuests', () => {
  it('una lista numerada: el número en su círculo, el título y «Nivel 15»', () => {
    const markup = html(
      <AchievementQuests
        quests={[
          { position: 1, level: 15, title: 'Esto hace aguas', href: '/esto-hace-aguas' },
          { position: 3, level: 25, title: 'El cazador cazado' },
        ]}
      />,
    )
    expect(markup).toContain('Las misiones, en orden')
    expect(markup).toContain('<span class="lq__n" aria-hidden="true">1</span>')
    // El título primero y el nivel debajo, sin «Misión 1 - »: el número ya lo dice.
    expect(markup).toMatch(
      /<h3 class="lq__t">.*Esto hace aguas.*<\/h3><p class="lq__k">Nivel 15<\/p>/,
    )
    expect(markup).not.toContain('Misión 1 -')
    expect(markup.match(/<a /g)).toHaveLength(1)
    expect(markup).toContain('<a href="/esto-hace-aguas">Esto hace aguas</a>')
    expect(markup).toContain('El cazador cazado')
    // Sin progreso: ni casillas ni «Te toca».
    expect(markup).not.toMatch(/checkbox|Te toca/)
  })

  it('con cuatro o más, dos columnas: la línea acaba al final de la primera y sigue en la segunda', () => {
    const quests = [1, 2, 3, 4, 5].map((position) => ({ position, title: `M${position}` }))
    const markup = html(<AchievementQuests quests={quests} />)
    expect(markup).toContain('class="lq__list lq__list--cols" role="list" style="--rows:3"')
    expect(markup.match(/data-col-end=""/g)).toHaveLength(1)
    expect(markup).toMatch(/<li [^>]*data-col-end=""[^>]*>.*?M3/)
    expect(markup).toMatch(/<li [^>]*data-col-start=""[^>]*>.*?M4/)
    const three = html(<AchievementQuests quests={quests.slice(0, 3)} />)
    expect(three).not.toContain('lq__list--cols')
    expect(three).not.toContain('data-col-')
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
