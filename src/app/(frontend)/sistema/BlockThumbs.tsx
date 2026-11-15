import type { ReactNode } from 'react'

import { DofusNeedGroup, DofusPart } from '@/components/dofus/DofusGuideParts'
import { GuideBlocks, GuideBody } from '@/components/game/GuideBody'
import { QuestSteps } from '@/components/game/QuestSteps'
import { VideoFacade } from '@/components/game/VideoFacade'
import { type BlockThumbnailSlug, blockThumbnailSlugs } from '@/lib/admin/block-thumbnails'
import type { RichTextState } from '@/lib/guides/page'

import {
  achievement,
  dofusAchievementView,
  dofusNeeds,
  fight,
  imageAlt,
  images,
  items,
  samples,
  video,
} from './catalog-data'

// Los bloques del panel tal como los pinta la web, cada uno en su marco de 3:2: de aquí salen
// las miniaturas del selector de bloques (scripts/block-thumbnails.ts, que captura cada
// [data-block-thumb]). Los componentes son los de las páginas; el contenido, el del catálogo.

type Piece = string | { bold: string }

/** Un texto enriquecido de Lexical con sus párrafos; { bold } es un trozo en negrita. */
function rich(...paragraphs: Piece[][]): RichTextState {
  const text = (piece: Piece) =>
    typeof piece === 'string'
      ? { type: 'text', text: piece, format: 0, version: 1 }
      : { type: 'text', text: piece.bold, format: 1, version: 1 }
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: paragraphs.map((pieces) => ({
        type: 'paragraph',
        version: 1,
        children: pieces.map(text),
      })),
    },
  } as unknown as RichTextState
}

const startText = rich(
  ['Habla con ', { bold: 'Hupe Esse' }, ' en [7,-19] para empezar la misión.'],
  [
    'Te pedirá que lleves un paquete a ',
    { bold: 'Luci' },
    ', que espera en [3,-17] junto al zaap.',
  ],
)

const quest = dofusAchievementView.parts[0]
const firstAchievement = quest?.kind === 'achievement' ? quest.achievement : undefined
const quests = firstAchievement?.quests ?? []

// Los bloques de las guías de Dofus llevan el color de su sección, como en su página.
const DOFUS_BLOCKS = new Set<BlockThumbnailSlug>([
  'needItem',
  'needNote',
  'dofusAchievement',
  'dofusMetalogro',
  'dofusQuests',
  'dofusQuest',
  'dofusNote',
])

/** Lo que va en cada marco: el bloque con el componente que lo pinta en la web. */
const previews: Record<BlockThumbnailSlug, (prefix: string) => ReactNode> = {
  richText: () => <GuideBody blocks={[{ kind: 'richText', key: 'texto', content: startText }]} />,
  image: () => (
    <GuideBody
      blocks={[
        {
          kind: 'image',
          key: 'imagen',
          image: images.hupeEsse,
          alt: imageAlt.hupeEsse,
          caption: samples.hupeEsseCaption,
          priority: false,
        },
      ]}
    />
  ),
  video: () => (
    // El bloque Vídeo de las guías no lleva portada: la fachada enseña su título.
    <GuideBody blocks={[{ kind: 'video', key: 'video', url: video.url, title: video.title }]} />
  ),
  callout: () => (
    <GuideBody
      blocks={[
        {
          kind: 'callout',
          key: 'consejo',
          variant: 'tip',
          content: rich(['Vence primero al ', { bold: 'Ramán' }, '.']),
        },
        {
          kind: 'callout',
          key: 'cuidado',
          variant: 'warning',
          content: rich(['Las anutrof ', { bold: 'NO' }, ' deben morir.']),
        },
      ]}
    />
  ),
  fight: () => <GuideBody blocks={[{ kind: 'fight', key: 'combate', monsters: fight }]} />,
  step: (prefix) => (
    <div className="quest !p-0">
      <QuestSteps
        headingLevel={3}
        steps={[
          {
            id: `${prefix}-bloque-paso`,
            pin: { x: 4, y: -15 },
            content: (
              <GuideBlocks
                minHeading={3}
                figures
                blocks={[
                  {
                    kind: 'richText',
                    key: 'paso',
                    content: rich(['Vuelve a hablar con las anutrof y escóltalas fuera.']),
                  },
                  {
                    kind: 'image',
                    key: 'paso-imagen',
                    image: images.combat,
                    alt: '',
                    priority: false,
                  },
                ]}
              />
            ),
          },
        ]}
      />
    </div>
  ),
  proseVideo: () => (
    // Dentro de la entrada de una página de logro: la fachada tras un párrafo, con portada.
    <div className="logro__prose guide-body">
      <p>Antes de empezar, mira el vídeo: enseña el camino entero.</p>
      <VideoFacade url={video.url} title={video.title} poster={images.video} />
    </div>
  ),
  needItem: () => (
    <DofusNeedGroup
      group={{
        key: 'recursos',
        name: 'Recursos',
        parts: [
          {
            rows: [
              { kind: 'item', item: items.intestino, quantity: 3 },
              { kind: 'item', item: items.pelos, quantity: 1 },
              { kind: 'item', item: items.ojo, quantity: 5 },
              { kind: 'item', item: items.pico, quantity: 10 },
            ],
          },
        ],
      }}
    />
  ),
  needNote: () => (
    <DofusNeedGroup
      group={{
        key: 'mazmorras',
        name: 'Mazmorras',
        parts: dofusNeeds.groups.find((group) => group.key === 'mazmorras')?.parts ?? [],
      }}
    />
  ),
  dofusAchievement: () => quest && <DofusPart part={quest} />,
  dofusMetalogro: () => (
    <DofusPart
      part={{
        kind: 'metalogro',
        number: 1,
        name: 'Un comienzo ejemplar',
        achievements: [
          {
            name: achievement.name,
            href: '#la-ocasion',
            disabled: false,
            icon: achievement.icon,
            meta: ['2 misiones', 'Niveles 15 a 20'],
            quests: quests.slice(0, 2),
          },
          {
            name: 'Cazadores cazados',
            href: '#cazadores-cazados',
            disabled: false,
            meta: ['1 misión', 'Nivel 25'],
            quests: quests.slice(2, 3),
          },
        ],
      }}
    />
  ),
  dofusQuests: () => (
    <DofusPart
      part={{
        kind: 'quests',
        title: 'También algunas misiones random',
        quests: quests.slice(0, 3),
      }}
    />
  ),
  dofusQuest: () => (
    <DofusPart part={{ kind: 'quest', quest: { ...quests[1]!, note: 'Habla con Hupe Esse.' } }} />
  ),
  dofusNote: () => (
    <DofusPart
      part={{
        kind: 'note',
        text: rich(
          ['Antes de la misión del ', { bold: 'Cacao' }, ', guarda tres panes: los pide al final.'],
          ['Si te faltan, se compran en la panadería de Astrub.'],
        ),
      }}
    />
  ),
}

/**
 * Un marco por bloque, de ancho fijo y 3:2, con el bloque arriba y recortado abajo como una
 * captura. inert: son muestras, sin enlaces ni botones que enfocar.
 */
export function BlockThumbs({ prefix }: { prefix: string }) {
  return (
    <ul role="list" className="flex w-full flex-wrap gap-6">
      {blockThumbnailSlugs.map((slug) => (
        <li key={slug} className="grid gap-2">
          <div
            data-block-thumb={slug}
            inert
            className="flex aspect-[3/2] w-[24rem] flex-col justify-center-safe overflow-hidden border border-line bg-bg p-5"
          >
            {DOFUS_BLOCKS.has(slug) ? (
              <div className="dg-page">{previews[slug](prefix)}</div>
            ) : (
              previews[slug](prefix)
            )}
          </div>
          <code className="text-sm text-ink-2">{slug}</code>
        </li>
      ))}
    </ul>
  )
}
