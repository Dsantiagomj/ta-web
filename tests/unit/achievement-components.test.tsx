import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  AchievementCountsFor,
  AchievementHeader,
  AchievementNav,
  AchievementQuests,
  AchievementSheet,
  hasSheet,
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
  it('el icono, el título y el subtítulo; Prerrequisitos y Recompensas van en la ficha', () => {
    const markup = html(
      <AchievementHeader
        title="La ocasión hace al ladrón"
        icon={icon}
        meta={['3 misiones', 'Niveles 15 a 25', '10 puntos']}
      />,
    )
    expect(markup).toMatch(/^<header class="qhead lhead lhead--logro">/)
    expect(markup).toContain('<h1 class="qhead__title">La ocasión hace al ladrón</h1>')
    expect(markup).toContain('3 misiones - Niveles 15 a 25 - 10 puntos')
    expect(markup).toContain('src="/img/logro-203.webp"')
    expect(markup).not.toMatch(/Prerrequisitos|Recompensas|Necesitarás/)
  })
})

describe('AchievementSheet', () => {
  const text = (markup: string) => markup.replace(/<[^>]+>/g, '')
  const facts = {
    prerequisites: [
      { label: 'Archi y sus principios', quest: true, href: '/archi-y-sus-principios' },
      { label: 'Nivel 20', quest: false },
    ],
    rewards: {
      xp: { max: 102_128 },
      kamas: 1_105,
      items: [{ item: { name: 'Pergamino de sabiduría', icon }, quantity: 2 }],
      notes: [],
    },
  }
  const needs = {
    items: [
      { item: { name: 'Piedra de alma mediana', icon }, quantity: 1 },
      { item: { name: 'Llave de la Fábrica de Malefíscof' } },
    ],
    tasks: [
      { quantity: 3, label: 'Combates realizables en grupo', kind: 'combat' as const },
      { quantity: 1, label: 'Mazmorra Malefíscof', kind: 'dungeon' as const },
    ],
    others: [
      { label: 'Hechizo Captura de almas' },
      { quantity: 12, label: 'Delicia de los kitsus (un consumible que se compra en Pandala).' },
    ],
  }
  const sheet = (props: Partial<React.ComponentProps<typeof AchievementSheet>> = {}) =>
    html(<AchievementSheet facts={facts} needs={needs} {...props} />)

  /** Cada parte de la ficha: su clase, su título y si se pliega. */
  const parts = (markup: string) =>
    [
      ...markup.matchAll(/<section class="([^"]+)" aria-labelledby="([^"]+)">(.*?)<\/section>/g),
    ].map(([, className, id, body]) => ({
      className,
      heading: new RegExp(`<h2 class="lsheet__k" id="${id}">([^<]+)</h2>`).exec(body!)?.[1],
      folds: body!.startsWith('<details'),
    }))

  it('las recompensas, siempre a la vista; Prerrequisitos y Necesitarás en total, plegables', () => {
    const markup = sheet()
    expect(markup).toContain('<div class="lsheet">')
    expect(parts(markup)).toEqual([
      { className: 'lsheet__p', heading: 'Recompensas del logro', folds: false },
      { className: 'lsheet__p', heading: 'Prerrequisitos', folds: true },
      { className: 'lsheet__p lneeds', heading: 'Necesitarás en total', folds: true },
    ])
    // Cerradas en el HTML: la isla las abre desde 64rem y el CSS ya las enseña antes.
    expect(markup.match(/<details class="lsheet__d" data-sheet="">/g)).toHaveLength(2)
    expect(markup).not.toMatch(/<details[^>]* open/)
  })

  it('el título de cada parte plegable es el resumen, con su chevron y sin cifras', () => {
    const summaries = [...sheet().matchAll(/<summary class="lsheet__s">(.*?)<\/summary>/g)].map(
      ([, body]) => body!,
    )
    expect(summaries.map(text)).toEqual(['Prerrequisitos', 'Necesitarás en total'])
    for (const summary of summaries) expect(summary).toContain('lsheet__chev')
  })

  it('las recompensas en una fila: la XP, los kamas y la bolsa, como en la cabecera', () => {
    const markup = sheet()
    expect(markup).toContain('<ul role="list" class="lsheet__rew">')
    // Los miles, con un espacio que no se parte.
    expect(text(markup)).toMatch(/102\s128 XP/)
    expect(text(markup)).toMatch(/1\s105 kamas/)
    expect(markup).toContain('data-bag=""')
    expect(text(markup)).toContain('2 × Pergamino de sabiduría')
  })

  it('los prerrequisitos, con el libro de misión y su enlace cuando la guía está publicada', () => {
    const markup = sheet()
    expect(markup).toContain('<ul role="list" class="lsheet__pre">')
    expect(markup).toContain('<a href="/archi-y-sus-principios">Archi y sus principios</a>')
    expect(markup).toContain('src="/img/game/mision.webp"')
    expect(text(markup)).toContain('Nivel 20')
  })

  it('Necesitarás: Objetos y Combates y mazmorras en listas, y Otros en una sola línea después', () => {
    const markup = sheet()
    const groups = [...markup.matchAll(/<h3 class="lneeds__k" id="([^"]+)">([^<]+)<\/h3>/g)]
    expect(groups.map((group) => group[2])).toEqual(['Objetos', 'Combates y mazmorras', 'Otros'])
    // Cada lista se llama como su grupo.
    for (const [, id] of groups) expect(markup).toContain(`aria-labelledby="${id}"`)
    // Otros, la última, es prosa: sin huecos de icono y con el texto de Torre tal cual.
    const others = /<div class="lneeds__g lneeds__g--others">(.*?)<\/div>/.exec(markup)?.[1]
    expect(others).toBeTruthy()
    expect(others).toContain('class="lneeds__list lneeds__others"')
    expect(others).not.toContain('class="well')
    expect(text(others!)).toBe(
      'OtrosHechizo Captura de almas12 × Delicia de los kitsus (un consumible que se compra en Pandala).',
    )
  })

  it('los objetos con su icono, cantidad y nombre que se copia; sin cantidad, solo el nombre', () => {
    const markup = sheet()
    expect(markup).toContain('data-copy="Piedra de alma mediana"')
    expect(markup).toContain('data-copy="Llave de la Fábrica de Malefíscof"')
    expect(text(markup)).toContain('1 × Piedra de alma mediana')
    expect(text(markup)).not.toContain('× Llave')
  })

  it('combates con su icono, la mazmorra con el de mazmorra; las notas no copian nada', () => {
    const markup = sheet()
    expect(markup).toContain('src="/img/game/combate.webp"')
    expect(markup).toContain('src="/img/game/jefes/crunchidor.webp"')
    expect(text(markup)).toContain('3 × Combates realizables en grupo')
    expect(text(markup)).toContain('1 × Mazmorra Malefíscof')
    expect(markup).not.toContain('data-copy="Hechizo')
  })

  it('una mazmorra casada pinta su jefe; la que no, el icono de mazmorra', () => {
    const boss = { ...icon, src: '/api/media/file/kumijo.webp' }
    const markup = sheet({
      needs: {
        items: [],
        tasks: [
          { quantity: 1, label: 'Mazmorra Kumijo', kind: 'dungeon', boss },
          { label: 'Mazmorras nivel 200', kind: 'dungeon' },
        ],
        others: [],
      },
    })
    const rows = markup
      .split('lneeds__tasks"')[1]!
      .split(/<li[ >]/)
      .slice(1)
    expect(rows[0]).toContain('kumijo.webp')
    expect(rows[0]).not.toContain('crunchidor')
    expect(rows[1]).toContain('src="/img/game/jefes/crunchidor.webp"')
  })

  it('dos en la misma página no repiten ids (el catálogo los pinta en cada tema)', () => {
    const markup = html(
      <>
        <AchievementSheet facts={facts} needs={needs} />
        <AchievementSheet facts={facts} needs={needs} />
        <AchievementQuests quests={[{ position: 1, title: 'Esto hace aguas' }]} />
        <AchievementQuests quests={[{ position: 1, title: 'Esto hace aguas' }]} />
      </>,
    )
    const ids = [...markup.matchAll(/ id="([^"]+)"/g)].map((match) => match[1])
    expect(ids.length).toBeGreaterThan(0)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('una parte o un grupo vacíos no se pintan; sin nada, no hay ficha', () => {
    const empty = { items: [], tasks: [], others: [] }
    const noRewards = { items: [], notes: [] }
    expect(text(sheet({ needs: { ...needs, others: [] } }))).not.toContain('Otros')
    expect(text(sheet({ needs: empty }))).not.toContain('Necesitarás')
    expect(text(sheet({ facts: { ...facts, prerequisites: [] } }))).not.toContain('Prerrequisitos')
    expect(text(sheet({ facts: { ...facts, rewards: noRewards } }))).not.toContain('Recompensas')
    expect(
      html(<AchievementSheet facts={{ prerequisites: [], rewards: noRewards }} needs={empty} />),
    ).toBe('')
  })
})

describe('hasSheet', () => {
  it('dice si la ficha tiene algo que enseñar: sin ella, la página es una sola columna', () => {
    const empty = { items: [], tasks: [], others: [] }
    const rewards = { items: [], notes: [] }
    expect(hasSheet({ prerequisites: [], rewards }, empty)).toBe(false)
    expect(hasSheet({ prerequisites: [], rewards: { ...rewards, kamas: 10 } }, empty)).toBe(true)
    expect(hasSheet({ prerequisites: [{ label: 'Nivel 20', quest: false }], rewards }, empty)).toBe(
      true,
    )
    expect(
      hasSheet({ prerequisites: [], rewards }, { ...empty, others: [{ label: '1 kama' }] }),
    ).toBe(true)
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
