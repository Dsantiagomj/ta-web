import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { AchievementChain } from '@/components/game/AchievementChain'
import { BotinCard } from '@/components/game/BotinCard'
import { CoordinatesChip, CoordinatesText, TravelButton } from '@/components/game/Coordinates'
import { FightBlock, MonsterChip } from '@/components/game/MonsterChip'
import { HeroHeader } from '@/components/game/HeroHeader'
import { ItemChip, ItemSlot } from '@/components/game/Item'
import { LevelMedallion } from '@/components/game/LevelMedallion'
import { PageEnhancements } from '@/components/game/PageEnhancements'
import { StagesTimeline } from '@/components/game/StagesTimeline'
import { SummaryRibbon } from '@/components/game/SummaryRibbon'
import { VideoFacade } from '@/components/game/VideoFacade'
import { IMAGE_SIZES } from '@/components/ui/image-sizes'

const html = (node: React.ReactNode) => renderToStaticMarkup(node)
const icon = { src: '/img/item-366.webp', width: 96, height: 96 }
const pico = { name: 'Pico de tofu', icon }
const achievement = { name: 'La ocasión hace al ladrón', href: '/logros/la-ocasion' }

describe('Coordenadas', () => {
  it('el chip enseña [x,y] y copia /travel x,y', () => {
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

describe('LevelMedallion', () => {
  it('se lee «Nivel 20»', () => {
    expect(html(<LevelMedallion level={20} />).replace(/<[^>]+>/g, '')).toBe('Nivel20')
  })
})

describe('HeroHeader', () => {
  const crumbs = [
    { label: 'Misiones', href: '/misiones' },
    { label: 'Astrub', href: '/astrub' },
  ]

  it('con arte: el arte decorativo va primero y sin carga diferida', () => {
    const markup = html(
      <HeroHeader
        title="Seis pies bajo tierra"
        subtitle="Misión de Astrub"
        level={20}
        crumbs={crumbs}
        art={{ image: { src: '/img/sp-5.webp', width: 960, height: 656 } }}
      />,
    )
    expect(markup).toContain('data-art=""')
    expect(markup).toMatch(/<img [^>]*alt=""[^>]*fetchPriority="high"/)
    expect(markup).not.toContain('loading="lazy"')
    expect(markup).toMatch(/<h1[^>]*>Seis pies bajo tierra<\/h1>/)
    expect(markup).toContain('aria-label="Migas de pan"')
    expect(markup).toContain('Nivel')
  })

  it('el arte ofrece cada ancho a lo ancho de la ventana, también el recorte de móvil', () => {
    const set = (name: string, format: string) => [
      { src: `/img/${name}-480.${format}`, width: 480 },
      { src: `/img/${name}-1600.${format}`, width: 1600 },
    ]
    const asset = (name: string) => ({
      src: `/img/${name}-1600.webp`,
      avif: `/img/${name}-1600.avif`,
      width: 1600,
      height: 686,
      srcSet: set(name, 'webp'),
      avifSrcSet: set(name, 'avif'),
    })
    const markup = html(
      <HeroHeader
        title="Seis pies bajo tierra"
        crumbs={crumbs}
        art={{ image: asset('ancho'), mobile: asset('movil') }}
      />,
    )
    expect(markup).toContain(
      '<source media="(max-width: 47.99rem)" type="image/avif" srcSet="/img/movil-480.avif 480w, /img/movil-1600.avif 1600w" sizes="100vw"/>',
    )
    expect(markup).toContain(
      '<source media="(max-width: 47.99rem)" type="image/webp" srcSet="/img/movil-480.webp 480w, /img/movil-1600.webp 1600w" sizes="100vw"/>',
    )
    expect(markup).toContain(
      '<source type="image/avif" srcSet="/img/ancho-480.avif 480w, /img/ancho-1600.avif 1600w" sizes="100vw"/>',
    )
    expect(markup).toMatch(
      /<img [^>]*srcSet="\/img\/ancho-480\.webp 480w, \/img\/ancho-1600\.webp 1600w"[^>]*sizes="100vw"/,
    )
  })

  it('sin arte: la misma cabecera sin imagen', () => {
    const markup = html(<HeroHeader title="Intoxicación profunda" crumbs={crumbs} />)
    expect(markup).not.toContain('<img')
    expect(markup).not.toContain('data-art')
    expect(markup).not.toContain('Nivel')
  })

  it('la sección se nombra con su título, con un id distinto en cada cabecera', () => {
    const markup = html(
      <>
        <HeroHeader title="Uno" crumbs={[]} />
        <HeroHeader title="Dos" crumbs={[]} />
      </>,
    )
    const labelled = [...markup.matchAll(/<section [^>]*aria-labelledby="([^"]+)"/g)].map(
      (m) => m[1],
    )
    expect(labelled).toHaveLength(2)
    expect(new Set(labelled).size).toBe(2)
    for (const id of labelled) expect(markup).toMatch(new RegExp(`<h1 [^>]*id="${id}"`))
  })

  it('acepta otro nivel de título, para el catálogo', () => {
    expect(html(<HeroHeader title="X" crumbs={[]} headingLevel={3} />)).toContain('<h3')
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

  it('sin icono deja el hueco vacío', () => {
    expect(html(<ItemSlot item={{ name: 'Ojo de arakmutada' }} quantity={1000} />)).not.toContain(
      '<img',
    )
    expect(html(<ItemSlot item={{ name: 'Ojo' }} quantity={1000} />)).toContain('1 000')
  })
})

describe('Combate', () => {
  it('cada monstruo con cantidad, nombre y nivel opcional', () => {
    const monster = { name: 'Ramán famélico', icon, level: 20 }
    expect(html(<MonsterChip monster={monster} quantity={1} />)).toContain('1 × Ramán famélico')
    expect(html(<MonsterChip monster={monster} quantity={1} />)).toContain('Nivel 20')
    expect(html(<MonsterChip monster={{ name: 'Kólerat' }} quantity={2} />)).not.toContain('Nivel')
  })

  it('el bloque es una lista', () => {
    const markup = html(<FightBlock monsters={[{ monster: { name: 'A' }, quantity: 1 }]} />)
    expect(markup).toMatch(/^<ul/)
  })
})

describe('SummaryRibbon', () => {
  const full = {
    start: { npc: 'Hupe Esse', place: 'Biblioteca de Astrub', x: 7, y: -19 },
    requires: [{ label: 'Esto hace aguas.', href: '/esto-hace-aguas' }],
    needs: { items: [{ item: pico, quantity: 1 }], notes: ['1 x Combate (solo).'] },
    reward: { xp: 16380, kamas: 390, items: 4 },
  }

  it('lleva Empieza, Requiere, Necesitarás y el enlace a la recompensa, sin nivel', () => {
    const markup = html(<SummaryRibbon {...full} />)
    for (const label of ['Empieza', 'Requiere', 'Necesitarás', 'Recompensa']) {
      expect(markup).toContain(label)
    }
    expect(markup).not.toContain('Nivel')
    expect(markup).toContain('href="#botin"')
    expect(markup).toContain('16 380 XP · 390 kamas · 4 objetos')
    expect(markup).toContain('data-copy="/travel 7,-19"')
  })

  it('deja fuera lo que falta y dice «1 objeto» en singular', () => {
    const markup = html(<SummaryRibbon reward={{ xp: 10, items: 1 }} />)
    expect(markup).not.toContain('Empieza')
    expect(markup).not.toContain('Requiere')
    expect(markup).not.toContain('Necesitarás')
    expect(markup).toContain('10 XP · 1 objeto')
  })

  it('no pinta nada sin ningún dato', () => {
    expect(html(<SummaryRibbon />)).toBe('')
  })
})

describe('StagesTimeline', () => {
  const stages = [
    { title: 'Habla con Hupe Esse', coordinates: { x: 7, y: -19 }, done: true, content: 'a' },
    { title: 'Escolta a las anutrof', content: 'b' },
  ]

  it('es una lista ordenada de etapas que se pueden marcar', () => {
    const markup = html(<StagesTimeline id="seis-pies" stages={stages} ticks />)
    expect(markup).toContain('<ol')
    expect(markup).toContain('id="seis-pies-e1"')
    expect(markup).toMatch(/<input [^>]*id="seis-pies-e1"[^>]*checked=""/)
    expect(markup).not.toMatch(/<input [^>]*id="seis-pies-e2"[^>]*checked=""/)
    expect(markup).toContain('Etapa 1 hecha')
    expect(markup).toContain('Por ahora no se guarda al salir.')
    // La píldora de progreso enciende cada segmento con su casilla, sin JavaScript.
    expect(markup).toContain('#seis-pies:has(#seis-pies-e2:checked) [data-seg="2"]')
    expect(markup).toContain('<h3')
  })

  it('sin marcas, ni casillas ni píldora', () => {
    const markup = html(<StagesTimeline id="corta" stages={stages} />)
    expect(markup).not.toContain('type="checkbox"')
    expect(markup).not.toContain('data-seg')
    expect(markup).not.toContain('no se guarda')
  })

  it('limpia el id antes de usarlo en un selector', () => {
    expect(html(<StagesTimeline id='a"b c' stages={stages} ticks />)).toContain('id="a-b-c-e1"')
    // Un selector #id no puede empezar por una cifra.
    expect(html(<StagesTimeline id="1976" stages={stages} ticks />)).toContain('id="e-1976-e1"')
  })
})

describe('BotinCard', () => {
  it('fichas de XP y kamas, una casilla por objeto y la cadena del logro', () => {
    const markup = html(
      <BotinCard
        xp={16380}
        kamas={390}
        items={[{ item: pico, quantity: 1 }]}
        chain={{ achievement, quests: [{ title: 'A', href: '/a' }, { title: 'B' }], current: 1 }}
      />,
    )
    expect(markup).toContain('id="botin"')
    expect(markup).toContain('16 380')
    expect(markup).toContain('Kamas')
    expect(markup).toContain('Pico de tofu')
    expect(markup).toContain('aria-label="Cadena del logro"')
  })

  it('sin objetos, la insignia dice XP', () => {
    expect(html(<BotinCard xp={1000} />)).toMatch(/aria-hidden="true"[^>]*>.*XP/)
  })

  it('no pinta nada sin recompensas', () => {
    expect(html(<BotinCard />)).toBe('')
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
