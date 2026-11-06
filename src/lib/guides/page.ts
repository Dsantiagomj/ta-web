// De la guía guardada a lo que pintan los componentes de la página (DESIGN.md, Quest guide).
// Código puro, sin Payload ni React: la página carga la guía con depth 2 y esto decide qué
// se enseña. Lo que la guía y su misión no guardan (render del PNJ, zona, logro) no se inventa, y sin bloques
// Paso no hay pasos: la prosa nunca se parte en pasos aquí.

import type { GameItem, Quantity } from '@/components/game/types'
import type { CalloutVariant } from '@/components/ui/strings'
import type { ImageAsset } from '@/components/ui/types'
import type { Coordinates } from '@/lib/guides/coordinates'
import { mediaImageAsset } from '@/lib/media/image-asset'
import type { Media, RichTextBlock } from '@/payload-types'

import { formatThousands, neededItems } from './format'
import { guideStrings } from './strings'
import type { LinkedRewards, LinkedNeeds } from './summary'

/**
 * Las páginas de logro aún viven en la web de Torre, con el mismo slug que tendrán aquí
 * (docs/legacy/plan.md). Cuando la app tenga las suyas, el enlace pasa a ser relativo.
 */
export const ACHIEVEMENT_PAGES_ORIGIN = 'https://www.torrentearcano.com'

/** El estado de Lexical de un campo richText. */
export type RichTextState = RichTextBlock['content']

/** Una relación de Payload: el ID sin poblar, el documento poblado o nada. */
type Relation<T> = number | T | null | undefined

interface GuideQuest {
  id: number
  name?: string | null
  levelMin?: number | null
  zone?: string | null
  achievement?: {
    dofusId?: number | null
    name?: string | null
    slug?: string | null
    position?: number | null
    total?: number | null
  } | null
  prerequisites?: Relation<{ id: number; name?: string | null }>[] | null
  startPositions?: { npcId?: number | null }[] | null
  rewards?: (LinkedRewards & { experienceMin?: number | null }) | null
}

/** El PNJ que da la misión, de la colección npcs con sus renders poblados. */
export interface GiverDoc {
  name?: string | null
  renderRight?: number | Media | null
  renderLeft?: number | Media | null
}

type ContentBlockDoc =
  | { blockType: 'richText'; id?: string | null; content: RichTextState }
  | { blockType: 'image'; id?: string | null; image: number | Media; caption?: string | null }
  | { blockType: 'video'; id?: string | null; url: string; title?: string | null }
  | { blockType: 'callout'; id?: string | null; variant: CalloutVariant; content: RichTextState }

/** Un paso: título, coordenadas si las tiene y sus propios bloques (DESIGN.md, Steps). */
type StepBlockDoc = {
  blockType: 'step'
  id?: string | null
  title?: string | null
  x?: number | null
  y?: number | null
  body?: ContentBlockDoc[] | null
}

type BodyBlockDoc = ContentBlockDoc | StepBlockDoc

/** Lo que la página lee de una guía de quest-guides; QuestGuide encaja. */
export interface GuideDoc {
  title: string
  slug: string
  quest?: Relation<GuideQuest>
  summary?: {
    prerequisites?: string | null
    rewards?: string | null
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
  | {
      kind: 'richText'
      key: string
      content: RichTextState
      /** Su primera imagen subida es la primera imagen del cuerpo: va con prioridad. */
      priorityImage?: true
    }
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
  | {
      kind: 'callout'
      key: string
      variant: CalloutVariant
      content: RichTextState
      priorityImage?: true
    }

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

/** El nivel del subtítulo: el mínimo de la misión enlazada (DESIGN.md, Quest header). */
export function guideLevel(guide: GuideDoc): number | undefined {
  return positive(linkedQuest(guide)?.levelMin)
}

/** El ID de DofusDB del PNJ que da la misión: el de su primera posición de inicio. */
export function questGiverId(guide: GuideDoc): number | null {
  const positions = linkedQuest(guide)?.startPositions ?? []
  return positions.find((position) => position.npcId != null)?.npcId ?? null
}

/** Las misiones previas pobladas: la página busca cuáles tienen guía publicada. */
export function prerequisiteQuestIds(guide: GuideDoc): number[] {
  return (linkedQuest(guide)?.prerequisites ?? []).flatMap((quest) =>
    quest && typeof quest === 'object' ? [quest.id] : [],
  )
}

/** Los objetos de Recompensas, con nombre, en el orden en que Torre los lista (al revés que DofusDB). */
function rewardItems(guide: GuideDoc): Quantity<GameItem>[] {
  const items = [...(linkedQuest(guide)?.rewards?.items ?? [])].reverse()
  return items.flatMap(({ item, quantity }) =>
    typeof item === 'object' && item.name ? [{ item: { name: item.name }, quantity }] : [],
  )
}

/** Una línea del resumen como fila: sin el punto final. */
function rowText(line: string): string {
  return line.replace(/\.$/, '')
}

// «1 x Combate (solo).»: la cantidad va aparte, en negrita, como en el juego.
const QUANTITY_NOTE = /^(\d+)\s*[x×]\s+(.+)$/u

/** Una nota de Necesitarás. combat: es un combate, y lleva el icono del juego. */
export interface NeedNote {
  quantity?: number
  label: string
  combat: boolean
}

function needNote(line: string): NeedNote {
  const text = rowText(line)
  const match = QUANTITY_NOTE.exec(text)
  const label = match ? match[2]! : text
  const combat = /\bcombates?\b/iu.test(label)
  return match ? { quantity: Number(match[1]), label, combat } : { label, combat }
}

/** Datos de la cabecera de la guía (DESIGN.md, Quest header). */
export interface QuestHeaderData {
  /** El subtítulo: «Misión de {zona} - Nivel {n} - Misión {k} del logro {logro}». */
  meta: {
    zone?: string
    level?: number
    achievement?: { name: string; href: string; position: number }
  }
  /** El PNJ que da la misión: solo con su render. */
  giver?: { name: string; right: ImageAsset; left?: ImageAsset; coordinates?: Coordinates }
  prerequisites: { label: string; href?: string; quest: boolean }[]
  needs: { items: Quantity<GameItem>[]; notes: NeedNote[] }
  rewards: {
    /** La XP del nivel óptimo (min) a la del tope (max), si son distintas. */
    xp?: { min?: number; max: number }
    kamas?: number
    items: Quantity<GameItem>[]
    /** Sin recompensas de DofusDB, las líneas que escribió Torre. */
    notes: string[]
  }
}

/**
 * La cabecera de la guía: subtítulo, PNJ y las tres columnas (Prerrequisitos, Necesitarás,
 * Recompensas). Lo que falta no se pinta ni se inventa: sin logro no hay «Misión k del
 * logro», sin render no hay PNJ. `linked` son las guías publicadas de las misiones previas.
 */
export function questHeaderProps(
  guide: GuideDoc,
  linked: QuestGuideLink[],
  giverDoc?: GiverDoc | null,
): QuestHeaderData {
  const quest = linkedQuest(guide)
  const summary = guide.summary ?? {}

  const meta: QuestHeaderData['meta'] = {}
  const zone = quest?.zone?.trim()
  if (zone) meta.zone = zone
  const level = guideLevel(guide)
  if (level) meta.level = level
  const achievement = quest?.achievement
  if (achievement?.name && achievement.slug && achievement.position) {
    meta.achievement = {
      name: achievement.name,
      href: `${ACHIEVEMENT_PAGES_ORIGIN}/${achievement.slug}`,
      position: achievement.position,
    }
  }

  let giver: QuestHeaderData['giver']
  const right = mediaImageAsset(giverDoc?.renderRight)
  if (giverDoc && right) {
    const left = mediaImageAsset(giverDoc.renderLeft)
    const coordinates =
      summary.startX != null && summary.startY != null
        ? { x: summary.startX, y: summary.startY }
        : undefined
    giver = {
      name: summary.startNpc?.trim() || giverDoc.name?.trim() || '',
      right,
      ...(left && { left }),
      ...(coordinates && { coordinates }),
    }
  }

  const slugByQuest = new Map(linked.map((link) => [link.questId, link.slug]))
  const previous = (quest?.prerequisites ?? []).flatMap((prerequisite) =>
    prerequisite && typeof prerequisite === 'object' && prerequisite.name
      ? [{ name: comparable(prerequisite.name), slug: slugByQuest.get(prerequisite.id) }]
      : [],
  )
  const prerequisites = lines(summary.prerequisites).map((line) => {
    const match = previous.find((candidate) => candidate.name === comparable(line))
    const label = rowText(line)
    return match?.slug
      ? { label, href: `/${match.slug}`, quest: true }
      : { label, quest: Boolean(match) }
  })

  const needs = {
    items: neededItems(summary.needs).map(({ item, quantity }) => ({
      item: { name: item.name ?? '' },
      quantity,
    })),
    notes: lines(summary.needs?.notes).map(needNote),
  }

  const max = positive(quest?.rewards?.experience)
  const min = positive(quest?.rewards?.experienceMin)
  const kamas = positive(quest?.rewards?.kamas)
  const items = rewardItems(guide)
  const rewards: QuestHeaderData['rewards'] =
    max || kamas || items.length
      ? {
          ...(max && { xp: min && min < max ? { min, max } : { max } }),
          ...(kamas && { kamas }),
          items,
          notes: [],
        }
      : { items: [], notes: lines(summary.rewards).map(rowText) }

  return { meta, ...(giver && { giver }), prerequisites, needs, rewards }
}

type LexicalNode = { type?: string; value?: unknown; children?: LexicalNode[] }

/** Si un texto tiene una imagen subida que se pinta (con archivo y tamaño). */
function hasImage(content: RichTextState): boolean {
  const visit = (nodes: LexicalNode[] = []): boolean =>
    nodes.some(
      (node) =>
        (node.type === 'upload' && mediaImageAsset(node.value as Media | number) !== null) ||
        visit(node.children),
    )
  return visit(content.root.children as LexicalNode[])
}

/** Un paso de la guía listo para su componente (DESIGN.md, Steps). */
export interface GuideStep {
  key: string
  /** Solo para el panel: la página no lo enseña (DESIGN.md, Steps). */
  title?: string
  /** Solo con X e Y: la lista «Pasos» y, si el texto no las nombra, un chip al principio del paso. */
  coordinates?: Coordinates
  blocks: GuideBlock[]
}

/**
 * El cuerpo partido como lo pinta la página: la prosa antes del primer paso, los pasos y
 * la prosa después del último. Sin pasos, todo el cuerpo es la entrada.
 */
export interface GuideContent {
  intro: GuideBlock[]
  steps: GuideStep[]
  outro: GuideBlock[]
}

/**
 * Los bloques del cuerpo, en orden, repartidos en entrada, pasos y cierre. Un bloque
 * suelto entre dos pasos se queda al final del paso anterior, para no cambiar el orden
 * de lectura. Una imagen sin archivo se salta; las que tienen sus variantes llevan
 * srcset. Un vídeo sin título usa el de la guía. La primera imagen en el orden del
 * documento, sea un bloque Imagen o una imagen dentro de un texto, y esté o no dentro de
 * un paso, va con prioridad.
 */
export function guideContent(guide: GuideDoc): GuideContent {
  let firstImage = true

  const toBlocks = (block: ContentBlockDoc, key: string): GuideBlock[] => {
    switch (block.blockType) {
      case 'richText':
      case 'callout': {
        const priority = firstImage && hasImage(block.content)
        if (priority) firstImage = false
        const extra = priority ? { priorityImage: true as const } : {}
        return block.blockType === 'richText'
          ? [{ kind: 'richText', key, content: block.content, ...extra }]
          : [{ kind: 'callout', key, variant: block.variant, content: block.content, ...extra }]
      }
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
  }

  const body = guide.body ?? []
  let lastStep = -1
  body.forEach((block, index) => {
    if (block.blockType === 'step') lastStep = index
  })

  const content: GuideContent = { intro: [], steps: [], outro: [] }
  body.forEach((block, index) => {
    const key = block.id ?? String(index)
    if (block.blockType !== 'step') {
      const blocks = toBlocks(block, key)
      const current = content.steps.at(-1)
      if (!current) content.intro.push(...blocks)
      else if (index > lastStep) content.outro.push(...blocks)
      else current.blocks.push(...blocks)
      return
    }
    const coordinates = block.x != null && block.y != null ? { x: block.x, y: block.y } : null
    const title = block.title?.trim()
    content.steps.push({
      key,
      ...(title && { title }),
      ...(coordinates && { coordinates }),
      blocks: (block.body ?? []).flatMap((inner, innerIndex) =>
        toBlocks(inner, inner.id ?? `${key}-${innerIndex}`),
      ),
    })
  })
  return content
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
