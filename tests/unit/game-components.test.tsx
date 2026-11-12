import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { AchievementChain } from '@/components/game/AchievementChain'
import { CoordinatesChip, CoordinatesText, TravelButton } from '@/components/game/Coordinates'
import { FightBlock } from '@/components/game/FightBlock'
import { NextQuestCard } from '@/components/game/NextQuestCard'
import { ItemChip, ItemSlot } from '@/components/game/Item'
import { GAME_ICONS } from '@/components/game/game-icons'
import { IconWell } from '@/components/game/IconWell'
import { PageEnhancements } from '@/components/game/PageEnhancements'
import { QuestHeader } from '@/components/game/QuestHeader'
import { QuestSteps } from '@/components/game/QuestSteps'
import { TorreTips } from '@/components/game/TorreTips'
import type { QuestHeaderData } from '@/lib/guides/page'
import { VideoFacade } from '@/components/game/VideoFacade'
import { IMAGE_SIZES } from '@/components/ui/image-sizes'

const html = (node: React.ReactNode) => renderToStaticMarkup(node)
const icon = { src: '/img/item-366.webp', width: 96, height: 96 }
const pico = { name: 'Pico de tofu', icon }
const achievement = { name: 'La ocasión hace al ladrón', href: '/logros/la-ocasion' }

describe('Coordenadas', () => {
  it('el chip enseña una chincheta y [x,y], y copia /travel x,y', () => {
    const markup = html(<CoordinatesChip x={7} y={-19} />)
    expect(markup).toContain('data-copy="/travel 7,-19"')
    expect(markup).toContain('[7,-19]')
    // Sin JavaScript es texto; la isla le da el nombre, que empieza por el texto visible.
    expect(markup).toMatch(/^<span /)
    expect(markup).toContain('data-copy-label="[7,-19], copiar /travel 7,-19"')
  })

  it('convierte en chips las coordenadas escritas en la prosa', () => {
    const markup = html(<CoordinatesText>Habla con Luci [3,-17]. Nivel [20].</CoordinatesText>)
    expect(markup.match(/data-copy=/g)).toHaveLength(1)
    expect(markup).toContain('Habla con Luci ')
    expect(markup).toContain('. Nivel [20].')
  })

  it('el botón de inicio dice lo que copia', () => {
    const markup = html(<TravelButton x={7} y={-19} />)
    expect(markup).toContain('data-copy="/travel 7,-19"')
    expect(markup).toContain('Copiar')
    expect(markup).toContain('/travel 7,-19')
  })
})

describe('Objetos', () => {
  it('el chip enseña icono, nombre y cantidad', () => {
    const markup = html(<ItemChip item={pico} quantity={1} />)
    expect(markup).toContain('alt=""')
    expect(markup).toContain('Pico de tofu')
    expect(markup).toContain('× 1')
  })

  it('la casilla se lee «1 × Pico de tofu» y la cifra dibujada es decorativa', () => {
    const markup = html(<ItemSlot item={pico} quantity={1} />)
    expect(markup).toContain('1 × </span>')
    expect(markup).toMatch(/aria-hidden="true"[^>]*>1<\/span>/)
  })

  // Solo el nombre es el botón: su texto visible es el nombre accesible sin «Copiar»
  // (WCAG 2.5.3); su ::after cubre el chip o la casilla, así que el icono también copia.
  const copyName = (name: string) =>
    `<span class="copyname" data-copy="${name}" data-copy-label="Copiar ${name}" data-copy-failed="No se pudo copiar. Busca «${name}» en el juego."><span class="copyname__t">${name}`

  it('el chip copia el nombre del objeto, sin la cantidad', () => {
    const markup = html(<ItemChip item={pico} quantity={1} />)
    expect(markup).toMatch(/^<span class="copyhost /)
    expect(markup).toContain(copyName('Pico de tofu'))
    expect(markup.match(/data-copy=/g)).toHaveLength(1)
  })

  it('la casilla copia el nombre del objeto y sigue siendo un elemento de la lista', () => {
    const markup = html(<ItemSlot item={pico} quantity={1} />)
    expect(markup).toMatch(/^<li class="copyhost /)
    expect(markup).toContain(copyName('Pico de tofu'))
    // La cantidad se sigue leyendo antes del nombre, fuera del botón.
    expect(markup).toContain('<span class="sr-only">1 × </span><span class="copyname"')
  })

  it('el icono de copiar y el de hecho van dentro del nombre, ocultos a los lectores', () => {
    const markup = html(<ItemChip item={pico} quantity={1} />)
    expect(markup.match(/class="copyname__i[^"]*"/g)).toEqual([
      'class="copyname__i"',
      'class="copyname__i copyname__ok"',
    ])
  })

  it('sin icono deja el hueco vacío', () => {
    expect(html(<ItemSlot item={{ name: 'Ojo de arakmutada' }} quantity={1000} />)).not.toContain(
      '<img',
    )
    expect(html(<ItemSlot item={{ name: 'Ojo' }} quantity={1000} />)).toContain('1 000')
  })
})

describe('Combate', () => {
  it('una lista de filas: la imagen del monstruo en su hueco y «1 × Nombre»', () => {
    const markup = html(
      <FightBlock
        monsters={[
          { item: { name: 'Ramán famélico', icon }, quantity: 1 },
          { item: { name: 'Kólerat' }, quantity: 2 },
        ]}
      />,
    )
    expect(markup).toMatch(/^<ul role="list" class="mobs">/)
    expect(markup.match(/<li class="row">/g)).toHaveLength(2)
    expect(markup).toContain('<b>1 ×</b> Ramán famélico')
    expect(markup).toContain('<b>2 ×</b> Kólerat')
    // La imagen es decorativa y nunca se amplía: el archivo es de 96px, el hueco la pinta a 42.
    expect(markup).toContain('src="/img/item-366.webp"')
    expect(markup).toContain('alt=""')
    // Sin imagen, el hueco queda vacío.
    expect(markup).toContain('<span class="well well--mob" aria-hidden="true"></span>')
  })
})

describe('NextQuestCard', () => {
  const card = {
    title: 'El cazador cazado',
    href: '/el-cazador-cazado',
    level: 25,
    npc: 'Kerubim Crepin',
    coordinates: { x: 3, y: -17 },
    art: {
      src: '/img/kerubim-800.webp',
      width: 800,
      height: 575,
      srcSet: [
        { src: '/img/kerubim-480.webp', width: 480 },
        { src: '/img/kerubim-800.webp', width: 800 },
      ],
    },
  }

  it('toda la tarjeta es un enlace: arte, «Siguiente misión», título y quién la da', () => {
    const markup = html(<NextQuestCard card={card} />)
    expect(markup).toMatch(/^<a class="nextq" href="\/el-cazador-cazado" data-art="">/)
    expect(markup).toContain('<span class="nextq__k">Siguiente misión</span>')
    expect(markup).toContain('<span class="nextq__t">El cazador cazado</span>')
    expect(markup.replace(/<[^>]+>/g, '')).toContain(
      'Nivel 25. Te la da Kerubim Crepin [3,-17] al terminar esta.',
    )
    expect(markup).toContain('<b>25</b>')
    expect(markup).toContain('<b>[3,-17]</b>')
    expect(markup).toContain('src="/img/kerubim-800.webp"')
    expect(markup).toContain(`sizes="${IMAGE_SIZES.card}"`)
    expect(markup).toContain('loading="lazy"')
  })

  it('sin arte, nivel o PNJ, la tarjeta va sin ellos', () => {
    const markup = html(<NextQuestCard card={{ title: 'X', href: '/x' }} />)
    expect(markup).not.toContain('data-art')
    expect(markup).not.toContain('nextq__m')
    expect(markup).not.toContain('<img')
    expect(html(<NextQuestCard card={{ title: 'X', href: '/x', level: 25 }} />)).toContain(
      'Nivel <b>25</b>.</span>',
    )
  })
})

describe('IMAGE_SIZES de la tarjeta', () => {
  it('el arte de la tarjeta: 280px desde 640px; debajo, a lo ancho de la columna', () => {
    expect(IMAGE_SIZES.card).toBe('(min-width: 40rem) 280px, calc(100vw - 32px)')
  })
})

describe('QuestHeader', () => {
  const render = { src: '/img/pnj-derecha.webp', width: 334, height: 720 }
  const left = {
    src: '/img/pnj-izquierda.webp',
    avif: '/img/pnj-izquierda.avif',
    width: 186,
    height: 400,
  }
  const data: QuestHeaderData = {
    meta: {
      zone: 'Astrub',
      level: 20,
      achievement: { position: 2, total: 3 },
    },
    giver: { name: 'Hupe Esse', right: render, left, coordinates: { x: 7, y: -19 } },
    prerequisites: [
      { label: 'Esto hace aguas', href: '/esto-hace-aguas', quest: true },
      { label: 'Nivel mínimo 20', quest: false },
    ],
    needs: { items: [], notes: [{ quantity: 1, label: 'Combate (solo)', combat: true }] },
    rewards: {
      xp: { min: 9800, max: 16380 },
      kamas: 390,
      items: [
        { item: { name: 'Pico de tofu', icon }, quantity: 1 },
        { item: { name: 'Ojo de arakmutada' }, quantity: 1 },
      ],
      notes: [],
    },
  }
  // Las cifras separan los miles con un espacio que no se parte.
  const text = (markup: string) => markup.replace(/<[^>]+>/g, '').replaceAll('\u00a0', ' ')

  it('el título es el h1 y el subtítulo dice zona, nivel y «Misión 2 de 3», sin enlace', () => {
    const markup = html(<QuestHeader title="Seis pies bajo tierra" data={data} />)
    expect(markup).toContain('<h1 class="qhead__title">Seis pies bajo tierra</h1>')
    expect(text(markup)).toContain('Misión de Astrub - Nivel 20 - Misión 2 de 3')
    // El logro lo nombran las migas: ni trofeo ni enlace en el subtítulo.
    expect(markup).not.toContain('/img/game/logro.webp')
    expect(markup).not.toContain('qhead__ach')
  })

  it('sin logro ni zona, el subtítulo solo lleva lo que hay', () => {
    const markup = html(<QuestHeader title="x" data={{ ...data, meta: { level: 20 } }} />)
    expect(text(markup)).toContain('Nivel 20')
    expect(markup).not.toContain('Misión 2 de')
    expect(html(<QuestHeader title="x" data={{ ...data, meta: {} }} />)).not.toContain(
      'qhead__meta',
    )
  })

  it('el PNJ: su render a la derecha, el de la izquierda en el móvil, y su nombre como texto', () => {
    const markup = html(<QuestHeader title="x" data={data} />)
    expect(markup).toContain('data-giver=""')
    expect(markup).toContain('media="(max-width: 35.99rem)"')
    expect(markup).toContain('srcSet="/img/pnj-izquierda.webp"')
    expect(markup).toMatch(/<img src="\/img\/pnj-derecha.webp" width="334" height="720" alt=""/)
    expect(text(markup)).toContain('Empieza con Hupe Esse')
    expect(markup).toContain('data-copy="/travel 7,-19"')
  })

  it('el render va solo; «Empieza con» el PNJ y su chip van en una línea bajo el subtítulo', () => {
    const markup = html(<QuestHeader title="x" data={data} />)
    expect(markup).not.toContain('<figcaption')
    expect(markup).toMatch(
      /<p class="qhead__meta">.*<\/p><p class="qhead__start">Empieza con <strong class="giver__name">Hupe Esse<\/strong> <span class="giver__pin"><span class="coord"/,
    )
  })

  it('sin coordenadas de inicio, la línea lleva solo el PNJ', () => {
    const { coordinates: _c, ...giver } = data.giver!
    const markup = html(<QuestHeader title="x" data={{ ...data, giver }} />)
    expect(markup).toContain('Empieza con <strong class="giver__name">Hupe Esse</strong></p>')
  })

  it('sin PNJ no hay columna ni sustituto', () => {
    const { giver: _giver, ...noGiver } = data
    const markup = html(<QuestHeader title="x" data={noGiver} />)
    expect(markup).not.toContain('data-giver')
    expect(markup).not.toContain('<figure')
  })

  it('las tres columnas con sus títulos, los iconos del juego y el rango de XP', () => {
    const markup = html(<QuestHeader title="x" data={data} />)
    for (const title of ['Prerrequisitos', 'Necesitarás', 'Recompensas']) {
      expect(markup).toMatch(new RegExp(`<h2 id="[^"]+">${title}</h2>`))
    }
    expect(markup).toContain('src="/img/game/mision.webp"')
    expect(markup).toContain('src="/img/game/combate.webp"')
    // La flecha de XP solo existe a 24px: no se amplía.
    expect(markup).toContain('src="/img/game/xp.webp" width="24" height="24"')
    expect(markup).toContain('src="/img/game/kamas.webp" width="34" height="34"')
    expect(text(markup)).toContain('9 800 a 16 380 XP')
    expect(text(markup)).toContain('390 kamas')
    expect(text(markup)).toContain('1 × Pico de tofu')
    expect(text(markup)).toContain('1 × Combate (solo)')
    expect(markup).toContain('<a href="/esto-hace-aguas">Esto hace aguas</a>')
  })

  it('las partes van en una banda (.facts) dentro de .qhead__facts, que mide su columna', () => {
    const markup = html(<QuestHeader title="x" data={data} />)
    expect(markup).toMatch(/<div class="qhead__facts"><div class="facts"><section /)
  })

  it('cada objeto de Necesitarás copia su nombre; las notas y la bolsa no copian nada', () => {
    const needs = {
      ...data,
      needs: {
        items: [{ item: { name: 'Pluma de Kwak de viento', icon }, quantity: 10 }],
        notes: [{ quantity: 1, label: 'Combate (solo)', combat: true }],
      },
    }
    const markup = html(<QuestHeader title="x" data={needs} />)
    const copies = [...markup.matchAll(/data-copy="([^"]+)"/g)].map((m) => m[1])
    // El /travel del PNJ y el objeto: ni la nota ni los objetos de la recompensa.
    expect(copies).toEqual(['/travel 7,-19', 'Pluma de Kwak de viento'])
    expect(markup).toContain('data-copy-label="Copiar Pluma de Kwak de viento"')
    expect(markup).toContain(
      'data-copy-failed="No se pudo copiar. Busca «Pluma de Kwak de viento» en el juego."',
    )
    // La fila sigue igual: el icono en su hueco, «10 ×» y el nombre, que es el botón.
    expect(markup).toMatch(/<li class="row copyhost"><span class="well"/)
    expect(markup).toMatch(
      /<b>10 ×<\/b> <span class="copyname" data-copy="Pluma de Kwak de viento"/,
    )
    expect(text(markup)).toContain('10 × Pluma de Kwak de viento')
  })

  it('Necesitarás: primero la lista de objetos y después, aparte, la de notas', () => {
    const needs = {
      ...data,
      needs: {
        items: [
          { item: { name: 'Pluma de Kwak de viento', icon }, quantity: 10 },
          { item: pico, quantity: 2 },
        ],
        notes: [
          { quantity: 1, label: 'Combate (solo)', combat: true },
          { quantity: 1, label: 'Mazmorra Guarida del Maxilubo', combat: false },
        ],
      },
    }
    const markup = html(<QuestHeader title="x" data={needs} />)
    const section = markup.slice(
      markup.indexOf('>Necesitarás</h2>'),
      markup.indexOf('</section>', markup.indexOf('>Necesitarás</h2>')),
    )
    const items = section.indexOf('<ul role="list" class="needs__items">')
    const notes = section.indexOf('<ul role="list" class="needs__notes">')
    expect(items).toBeGreaterThan(-1)
    expect(notes).toBeGreaterThan(items)
    // Cada lista solo lleva lo suyo: los objetos copian, las notas no.
    expect(section.slice(items, notes).match(/class="row copyhost"/g)).toHaveLength(2)
    expect(section.slice(notes).match(/<li /g)).toHaveLength(2)
    expect(section.slice(notes)).not.toContain('data-copy')
    expect(text(section.slice(notes))).toContain('1 × Mazmorra Guarida del Maxilubo')
  })

  it('Necesitarás sin notas no pinta su lista; sin objetos, tampoco la de objetos', () => {
    const onlyItems = { ...data, needs: { items: [{ item: pico, quantity: 1 }], notes: [] } }
    expect(html(<QuestHeader title="x" data={onlyItems} />)).not.toContain('needs__notes')
    expect(html(<QuestHeader title="x" data={data} />)).not.toContain('needs__items')
    expect(html(<QuestHeader title="x" data={data} />)).toContain('needs__notes')
  })

  it('los objetos de la recompensa van en la bolsa: un botón que abre su lista', () => {
    const markup = html(<QuestHeader title="x" data={data} />)
    const button = markup.match(/<button [^>]*class="bag__btn"[^>]*>/)?.[0] ?? ''
    expect(button).toContain('type="button"')
    expect(button).toContain('aria-expanded="false"')
    const controls = button.match(/aria-controls="([^"]+)"/)?.[1]
    expect(controls).toBeTruthy()
    expect(markup).toContain(
      `<ul role="list" id="${controls}" class="bag__list" aria-label="Objetos de recompensa">`,
    )
    // El icono de la bolsa del juego solo existe a 24px: no se amplía.
    expect(markup).toContain('src="/img/game/bolsa.webp" width="24" height="24" alt=""')
    expect(text(markup)).toContain('2 objetos')
    // La XP y los kamas siguen siendo filas; los objetos, solo dentro de la lista.
    const list = markup.slice(markup.indexOf('class="bag__list"'))
    expect(text(list)).toContain('1 × Pico de tofu')
    expect(text(list)).toContain('1 × Ojo de arakmutada')
    expect(list).toContain('src="/img/item-366.webp"')
    expect(markup.match(/data-bag=""/g)).toHaveLength(1)
  })

  it('con un solo objeto, la bolsa dice «1 objeto»', () => {
    const one = { ...data, rewards: { ...data.rewards, items: [data.rewards.items[0]!] } }
    expect(text(html(<QuestHeader title="x" data={one} />))).toContain('1 objeto')
    expect(text(html(<QuestHeader title="x" data={one} />))).not.toContain('1 objetos')
  })

  it('sin objetos de recompensa no hay bolsa', () => {
    const none = { ...data, rewards: { ...data.rewards, items: [] } }
    const markup = html(<QuestHeader title="x" data={none} />)
    expect(markup).not.toContain('data-bag')
    expect(markup).not.toContain('bolsa.webp')
    expect(text(markup)).toContain('390 kamas')
  })

  it('un objeto sin icono deja el hueco vacío; una línea sin icono no lleva hueco', () => {
    const markup = html(<QuestHeader title="x" data={data} />)
    expect(markup).toContain('<span class="well" aria-hidden="true"></span>')
    expect(markup).toMatch(/<li class="row"><span>Nivel mínimo 20<\/span><\/li>/)
  })

  it('sin datos no pinta las columnas', () => {
    const empty: QuestHeaderData = {
      meta: {},
      prerequisites: [],
      needs: { items: [], notes: [] },
      rewards: { items: [], notes: [] },
    }
    expect(html(<QuestHeader title="x" data={empty} />)).not.toContain('qhead__facts')
  })
})

describe('IMAGE_SIZES', () => {
  // Desde 64rem la raíz es el 110 %: la columna de 55rem mide 968px y los márgenes, 52,8px.
  it('las capturas ocupan la columna de lectura: 880px, 968px con la raíz al 110 %', () => {
    expect(IMAGE_SIZES.prose).toBe(
      '(min-width: 67.1rem) 968px, (min-width: 64rem) calc(100vw - 106px), ' +
        '(min-width: 58rem) 880px, (min-width: 40rem) calc(100vw - 48px), calc(100vw - 32px)',
    )
  })

  it('las capturas de un paso van de dos en dos desde 40rem: media columna menos el hueco', () => {
    expect(IMAGE_SIZES.half).toBe(
      '(min-width: 67.1rem) 476px, (min-width: 64rem) calc(50vw - 62px), ' +
        '(min-width: 58rem) 432px, (min-width: 40rem) calc(50vw - 32px), calc(100vw - 32px)',
    )
  })
})

describe('GAME_ICONS', () => {
  it('la bolsa del inventario es el archivo del juego de 24px', () => {
    expect(GAME_ICONS.bag).toEqual({ src: '/img/game/bolsa.webp', size: 24 })
  })
})

describe('IconWell', () => {
  it('el icono del juego a 34px como mucho, decorativo', () => {
    expect(html(<IconWell icon="combat" />)).toContain(
      '<img src="/img/game/combate.webp" width="34" height="34" alt=""',
    )
    expect(html(<IconWell icon="achievement" />)).toContain('width="28" height="28"')
  })

  it('pinta el icono a su tamaño en rem, para crecer con la fuente raíz', () => {
    expect(html(<IconWell icon="combat" />)).toContain(
      'class="size-(--icon)" style="--icon:2.125rem"',
    )
    // Un archivo más pequeño que el hueco no pasa de su tamaño con la raíz al 110 %.
    expect(html(<IconWell icon="xp" />)).toContain('style="--icon:min(1.5rem, 24px)"')
  })
})

describe('QuestSteps', () => {
  it('una lista ordenada de pasos con su ancla, sin números, títulos ni casillas', () => {
    const markup = html(
      <QuestSteps
        steps={[
          { id: 'paso-1', content: <p>Habla con Hupe Esse.</p> },
          { id: 'paso-2', pin: { x: 5, y: -18 }, content: <p>Ve al zaap.</p> },
        ]}
      />,
    )
    expect(markup).toMatch(/<h2 id="[^"]+" class="sr-only">Pasos<\/h2>/)
    expect(markup.match(/<li id="paso-\d"/g)).toHaveLength(2)
    expect(markup).not.toContain('qstep__n')
    expect(markup).not.toContain('data-step')
    expect(markup).not.toContain('<h3')
    expect(markup).not.toContain('type="checkbox"')
    expect(markup).toContain('data-copy="/travel 5,-18"')
  })
})

describe('TorreTips', () => {
  it('el avatar de Torre, decorativo, y el bocadillo con su título', () => {
    const markup = html(
      <TorreTips>
        <p>Intenta vencer primero al Ramán.</p>
      </TorreTips>,
    )
    expect(markup).toMatch(/<aside class="torre" aria-labelledby="[^"]+">/)
    expect(markup).toContain('src="/img/torre/avatar.webp"')
    expect(markup).toContain('alt=""')
    expect(markup).toMatch(/<h3 id="[^"]+">Recomendaciones de Torre<\/h3>/)
  })
})

describe('AchievementChain', () => {
  it('marca la misión actual y enlaza las demás', () => {
    const markup = html(
      <AchievementChain
        achievement={achievement}
        quests={[
          { title: 'Esto hace aguas', href: '/esto-hace-aguas' },
          { title: 'Seis pies bajo tierra' },
          { title: 'El cazador cazado', href: '/el-cazador-cazado' },
        ]}
        current={1}
      />,
    )
    expect(markup).toContain('misión 2 de 3')
    expect(markup).toMatch(/aria-current="page"[^>]*>Seis pies bajo tierra/)
    expect(markup).toContain('href="/el-cazador-cazado"')
    expect(markup).toContain('<ol')
  })

  it('recorta las cadenas largas', () => {
    const quests = 'abcdefgh'.split('').map((title) => ({ title, href: `/${title}` }))
    const markup = html(<AchievementChain achievement={achievement} quests={quests} current={4} />)
    expect(markup).toContain('…')
    expect(markup).not.toContain('href="/b"')
  })
})

describe('VideoFacade', () => {
  it('YouTube: un enlace al vídeo, sin iframe hasta pulsar', () => {
    const markup = html(
      <VideoFacade url="https://www.youtube.com/watch?v=VaY3tyYTq4A" title="El camino" />,
    )
    expect(markup).not.toContain('<iframe')
    expect(markup).toContain('href="https://www.youtube.com/watch?v=VaY3tyYTq4A"')
    expect(markup).toContain(
      'data-video-embed="https://www.youtube-nocookie.com/embed/VaY3tyYTq4A?autoplay=1"',
    )
    expect(markup).toContain('aria-label="Ver el vídeo: El camino"')
    expect(markup).not.toContain('ytimg')
  })

  it('la portada ocupa la columna de lectura: sizes de la columna', () => {
    const poster = {
      src: '/img/v-800.webp',
      width: 800,
      height: 450,
      srcSet: [
        { src: '/img/v-480.webp', width: 480 },
        { src: '/img/v-800.webp', width: 800 },
      ],
    }
    const markup = html(
      <VideoFacade
        url="https://www.youtube.com/watch?v=VaY3tyYTq4A"
        title="El camino"
        poster={poster}
      />,
    )
    expect(markup).toContain('srcSet="/img/v-480.webp 480w, /img/v-800.webp 800w"')
    expect(markup).toContain(`sizes="${IMAGE_SIZES.prose}"`)
  })

  it('un dato guardado que no es de YouTube: un enlace normal, solo por si acaso', () => {
    const markup = html(<VideoFacade url="https://vimeo.com/1" title="Otro" />)
    expect(markup).toContain('href="https://vimeo.com/1"')
    expect(markup).not.toContain('data-video-embed')
  })
})

describe('PageEnhancements', () => {
  it('deja preparada la región de estado del aviso «Copiado»', () => {
    expect(html(<PageEnhancements />)).toContain('role="status"')
  })

  it('deja preparado el visor de imágenes: un <dialog> cerrado y con nombre', () => {
    const markup = html(<PageEnhancements />)
    expect(markup).toMatch(/<dialog [^>]*aria-label="Imagen a pantalla completa"/)
    expect(markup).not.toMatch(/<dialog [^>]*\bopen\b/)
  })
})
