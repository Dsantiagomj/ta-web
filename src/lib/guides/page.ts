// De la guía guardada a lo que pintan los componentes de la página (DESIGN.md, Quest guide).
// Código puro, sin Payload ni React: la página carga la guía con depth 2 y esto decide qué
// se enseña. Lo que la guía aún no guarda (arte, zona, etapas, logro) no se inventa.

import type { GameItem, Quantity } from '@/components/game/types'
import type { CalloutVariant } from '@/components/ui/strings'
import type { ImageAsset } from '@/components/ui/types'
import { mediaImageAsset } from '@/lib/media/image-asset'
import type { Media, RichTextBlock } from '@/payload-types'

import { formatThousands, neededItems } from './format'
import { guideStrings } from './strings'
import type { LinkedRewards, LinkedNeeds } from './summary'

/** El estado de Lexical de un campo richText. */
export type RichTextState = RichTextBlock['content']

/** Una relación de Payload: el ID sin poblar, el documento poblado o nada. */
type Relation<T> = number | T | null | undefined

interface GuideQuest {
  id: number
  name?: string | null
  levelMin?: number | null
  prerequisites?: Relation<{ id: number; name?: string | null }>[] | null
  rewards?: LinkedRewards | null
}

type BodyBlockDoc =
  | { blockType: 'richText'; id?: string | null; content: RichTextState }
  | { blockType: 'image'; id?: string | null; image: number | Media; caption?: string | null }
  | { blockType: 'video'; id?: string | null; url: string; title?: string | null }
  | { blockType: 'callout'; id?: string | null; variant: CalloutVariant; content: RichTextState }

/** Lo que la página lee de una guía de quest-guides; QuestGuide encaja. */
export interface GuideDoc {
  title: string
  slug: string
  quest?: Relation<GuideQuest>
  summary?: {
    prerequisites?: string | null
    needs?: { items?: LinkedNeeds['items']; notes?: string | null }
    startNpc?: string | null
    startX?: number | null
    startY?: number | null
  }
  body?: BodyBlockDoc[] | null
  seo?: { metaTitle?: string | null; metaDescription?: string | null }
}

/** La guía publicada de una misión: los prerrequisitos que la tienen son enlaces. */
export interface QuestGuideLink {
  questId: number
  slug: string
}

/** Un bloque del cuerpo listo para su componente. */
export type GuideBlock =
  | { kind: 'richText'; key: string; content: RichTextState }
  | {
      kind: 'image'
      key: string
      image: ImageAsset
      alt: string
      caption?: string
      /**
       * La primera captura: mientras la cabecera no tiene arte, en el móvil cae en la
       * primera pantalla y es la LCP. Con el arte, la LCP será la cabecera.
       */
      priority: boolean
    }
  | { kind: 'video'; key: string; url: string; title: string }
  | { kind: 'callout'; key: string; variant: CalloutVariant; content: RichTextState }

function linkedQuest(guide: GuideDoc): GuideQuest | null {
  return guide.quest && typeof guide.quest === 'object' ? guide.quest : null
}

/** Las líneas no vacías de un texto del resumen. */
function lines(text: string | null | undefined): string[] {
  return (text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

// Para casar una línea de Requiere con el nombre de una misión: sin punto final ni mayúsculas.
function comparable(text: string): string {
  return text
    .normalize('NFC')
    .replace(/[.…]+$/, '')
    .trim()
    .toLocaleLowerCase('es')
}

function positive(value: number | null | undefined): number | undefined {
  return value && value > 0 ? value : undefined
}

/** El nivel del medallón: el mínimo de la misión enlazada (DESIGN.md, Level medallion). */
export function guideLevel(guide: GuideDoc): number | undefined {
  return positive(linkedQuest(guide)?.levelMin)
}

/** Las misiones previas pobladas: la página busca cuáles tienen guía publicada. */
export function prerequisiteQuestIds(guide: GuideDoc): number[] {
  return (linkedQuest(guide)?.prerequisites ?? []).flatMap((quest) =>
    quest && typeof quest === 'object' ? [quest.id] : [],
  )
}

/** Los objetos del Botín, con nombre, en el orden en que Torre los lista (al revés que DofusDB). */
function rewardItems(guide: GuideDoc): Quantity<GameItem>[] {
  const items = [...(linkedQuest(guide)?.rewards?.items ?? [])].reverse()
  return items.flatMap(({ item, quantity }) =>
    typeof item === 'object' && item.name ? [{ item: { name: item.name }, quantity }] : [],
  )
}

/** El Botín, de las recompensas de la misión (DESIGN.md, Botín card); sin misión, null. */
export function botinProps(guide: GuideDoc) {
  const quest = linkedQuest(guide)
  if (!quest) return null
  return {
    xp: positive(quest.rewards?.experience),
    kamas: positive(quest.rewards?.kamas),
    items: rewardItems(guide),
  }
}

/**
 * El resumen bajo la cabecera (DESIGN.md, Summary ribbon). Sin la zona del PNJ, que la guía
 * aún no guarda. `linked` son las guías publicadas de las misiones previas.
 */
export function ribbonProps(guide: GuideDoc, linked: QuestGuideLink[]) {
  const summary = guide.summary ?? {}
  const npc = summary.startNpc?.trim()
  const start =
    npc && summary.startX != null && summary.startY != null
      ? { npc, x: summary.startX, y: summary.startY }
      : undefined

  const slugByQuest = new Map(linked.map((link) => [link.questId, link.slug]))
  const prerequisites = (linkedQuest(guide)?.prerequisites ?? []).flatMap((quest) =>
    quest && typeof quest === 'object' && quest.name
      ? [{ name: comparable(quest.name), slug: slugByQuest.get(quest.id) }]
      : [],
  )
  const requires = lines(summary.prerequisites).map((label) => {
    const slug = prerequisites.find((quest) => quest.name === comparable(label))?.slug
    return slug ? { label, href: `/${slug}` } : { label }
  })

  const botin = botinProps(guide)
  const reward =
    botin && (botin.xp || botin.kamas || botin.items.length)
      ? { xp: botin.xp, kamas: botin.kamas, items: botin.items.length }
      : undefined

  return {
    start,
    requires,
    needs: {
      items: neededItems(summary.needs).map(({ item, quantity }) => ({
        item: { name: item.name ?? '' },
        quantity,
      })),
      notes: lines(summary.needs?.notes),
    },
    reward,
  }
}

/**
 * Los bloques del cuerpo, en orden. Una imagen sin archivo se salta; las que tienen sus
 * variantes llevan srcset. Un vídeo sin título usa el de la guía.
 */
export function guideBlocks(guide: GuideDoc): GuideBlock[] {
  let firstImage = true
  return (guide.body ?? []).flatMap((block, index): GuideBlock[] => {
    const key = block.id ?? String(index)
    switch (block.blockType) {
      case 'richText':
        return [{ kind: 'richText', key, content: block.content }]
      case 'callout':
        return [{ kind: 'callout', key, variant: block.variant, content: block.content }]
      case 'video':
        return [
          {
            kind: 'video',
            key,
            url: block.url,
            title: block.title?.trim() || guideStrings.page.videoTitle(guide.title),
          },
        ]
      case 'image': {
        const image = mediaImageAsset(block.image)
        if (!image || typeof block.image !== 'object') return []
        const caption = block.caption?.trim()
        const priority = firstImage
        firstImage = false
        return [
          {
            kind: 'image',
            key,
            image,
            alt: block.image.alt ?? '',
            ...(caption && { caption }),
            priority,
          },
        ]
      }
      default:
        return []
    }
  })
}

/** Título y descripción para buscadores; sin los de la guía, los del autorrelleno. */
export function guideSeo(guide: GuideDoc): { title: string; description: string } {
  const experience = positive(linkedQuest(guide)?.rewards?.experience)
  return {
    title: guide.seo?.metaTitle?.trim() || guideStrings.seo.metaTitle(guide.title),
    description:
      guide.seo?.metaDescription?.trim() ||
      guideStrings.seo.metaDescription({
        name: guide.title,
        level: guideLevel(guide) ?? null,
        experience: experience ? formatThousands(experience) : null,
      }),
  }
}
