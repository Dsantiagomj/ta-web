// Título, slug y SEO de una guía nueva, sacados de su misión de DofusDB. Solo se rellena
// lo vacío: lo que escribe Torre, o lo que trajo la importación, no se toca nunca.

import { formatThousands } from './format'
import { isReservedSlug } from './slug'
import { guideStrings } from './strings'
import type { LinkedQuest } from './summary'

const META_DESCRIPTION_MAX = 160

export interface AutofillFields {
  title?: string | null
  slug?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
}

/** El ID de la misión de la guía, venga como ID o como documento poblado. */
export function linkedQuestId(quest: unknown): number | null {
  if (typeof quest === 'number') return quest
  if (quest && typeof quest === 'object' && 'id' in quest && typeof quest.id === 'number') {
    return quest.id
  }
  return null
}

/** Slug plano en ASCII, el formato que exige validateSlug. */
export function slugFromName(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || guideStrings.fallbackSlug
}

/** El slug si está libre; si no, el primero libre con -2, -3… Uno reservado cuenta como ocupado. */
export async function availableSlug(
  base: string,
  isTaken: (slug: string) => Promise<boolean>,
): Promise<string> {
  if (!isReservedSlug(base) && !(await isTaken(base))) return base
  for (let suffix = 2; ; suffix += 1) {
    const candidate = `${base}-${suffix}`
    if (!(await isTaken(candidate))) return candidate
  }
}

// Corta en un espacio para no partir palabras.
function clip(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  const space = cut.lastIndexOf(' ')
  return `${(space > 0 ? cut.slice(0, space) : cut).replace(/[\s,:;]+$/, '')}…`
}

export function seoFromQuest(quest: LinkedQuest & { name: string }) {
  const experience = quest.rewards?.experience
  return {
    metaTitle: guideStrings.seo.metaTitle(quest.name),
    metaDescription: clip(
      guideStrings.seo.metaDescription({
        name: quest.name,
        level: quest.levelMin ?? null,
        experience: experience ? formatThousands(experience) : null,
      }),
      META_DESCRIPTION_MAX,
    ),
  }
}

const isBlank = (value: string | null | undefined) => !value?.trim()

/**
 * Los campos vacíos que la misión puede rellenar, con su valor. El slug sale sin comprobar
 * que esté libre: eso lo hace availableSlug con la base de datos o la API.
 */
export function autofillFromQuest(current: AutofillFields, quest: LinkedQuest): AutofillFields {
  const name = quest.name?.trim()
  if (!name) return {}
  const seo = seoFromQuest({ ...quest, name })
  const fill: AutofillFields = {}
  if (isBlank(current.title)) fill.title = name
  if (isBlank(current.slug)) fill.slug = slugFromName(name)
  if (isBlank(current.metaTitle)) fill.metaTitle = seo.metaTitle
  if (isBlank(current.metaDescription)) fill.metaDescription = seo.metaDescription
  return fill
}
