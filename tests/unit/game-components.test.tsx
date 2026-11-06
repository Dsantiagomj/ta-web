import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { AchievementChain } from '@/components/game/AchievementChain'
import { CoordinatesChip, CoordinatesText, TravelButton } from '@/components/game/Coordinates'
import { FightBlock, MonsterChip } from '@/components/game/MonsterChip'
import { ItemChip, ItemSlot } from '@/components/game/Item'
import { IconWell } from '@/components/game/IconWell'
import { PageEnhancements } from '@/components/game/PageEnhancements'
import { QuestHeader } from '@/components/game/QuestHeader'
import { QuestSteps, StepTracker } from '@/components/game/QuestSteps'
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
      achievement: {
        name: 'La ocasión hace al ladrón',
        href: 'https://www.torrentearcano.com/la-ocasion-hace-al-ladron',
        position: 2,
      },
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
      items: [{ item: { name: 'Pico de tofu' }, quantity: 1 }],
      notes: [],
    },
  }
  // Las cifras separan los miles con un espacio que no se parte.
  const text = (markup: string) => markup.replace(/<[^>]+>/g, '').replaceAll('\u00a0', ' ')

  it('el título es el h1 y el subtítulo nombra zona, nivel y logro, con su enlace', () => {
    const markup = html(<QuestHeader title="Seis pies bajo tierra" data={data} />)
    expect(markup).toContain('<h1 class="qhead__title">Seis pies bajo tierra</h1>')
    expect(text(markup)).toContain(
      'Misión de Astrub - Nivel 20 - Misión 2 del logro La ocasión hace al ladrón',
    )
    expect(markup).toContain('href="https://www.torrentearcano.com/la-ocasion-hace-al-ladron"')
    expect(markup).toContain('src="/img/game/logro.webp"')
  })

  it('sin logro ni zona, el subtítulo solo lleva lo que hay', () => {
    const markup = html(<QuestHeader title="x" data={{ ...data, meta: { level: 20 } }} />)
    expect(text(markup)).toContain('Nivel 20')
    expect(markup).not.toContain('del logro')
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
    expect(markup).toContain('src="/img/game/kamas.webp" width="32" height="32"')
    expect(text(markup)).toContain('9 800 a 16 380 XP')
    expect(text(markup)).toContain('390 kamas')
    expect(text(markup)).toContain('1 × Pico de tofu')
    expect(text(markup)).toContain('1 × Combate (solo)')
    expect(markup).toContain('<a href="/esto-hace-aguas">Esto hace aguas</a>')
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

describe('IconWell', () => {
  it('el icono del juego a 32px como mucho, decorativo', () => {
    expect(html(<IconWell icon="combat" />)).toContain(
      '<img src="/img/game/combate.webp" width="32" height="32" alt=""',
    )
    expect(html(<IconWell icon="achievement" />)).toContain('width="28" height="28"')
  })
})

describe('QuestSteps', () => {
  it('una lista ordenada de pasos con su número y su ancla, sin títulos ni casillas', () => {
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
    expect(markup).toContain('<span class="qstep__n" aria-hidden="true">2</span>')
    expect(markup).not.toContain('<h3')
    expect(markup).not.toContain('type="checkbox"')
    expect(markup).toContain('data-copy="/travel 5,-18"')
  })
})

describe('StepTracker', () => {
  it('enlaza cada paso con su etiqueta y sus coordenadas', () => {
    const markup = html(
      <StepTracker
        entries={[
          { id: 'paso-1', label: 'Hupe Esse', coordinates: { x: 7, y: -19 } },
          { id: 'paso-2', label: 'Paso 2' },
        ]}
      />,
    )
    expect(markup).toMatch(/<nav class="tracker" aria-labelledby="[^"]+">/)
    expect(markup).toContain('href="#paso-1"')
    expect(markup).toContain('Hupe Esse')
    expect(markup).toContain('7,-19')
  })

  it('sin pasos no pinta nada', () => {
    expect(html(<StepTracker entries={[]} />)).toBe('')
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
