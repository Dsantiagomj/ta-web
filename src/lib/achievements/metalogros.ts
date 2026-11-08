// El índice de metalogros (DESIGN.md, Metalogros index): las zonas de Torre en tres grupos,
// sus logros y guías, lo que está En preparación y los datos de la búsqueda. Código puro: la
// página carga los documentos y esto decide qué se pinta.

import type { ImageAsset } from '@/components/ui/types'
import { mediaImageAsset } from '@/lib/media/image-asset'
import type { Media } from '@/payload-types'

import type { IndexSearchData } from './metalogros-search'
import { achievementStrings, metalogrosStrings, type GroupSection, type PageState } from './strings'

type MediaRef = number | Media | (Partial<Media> & { id: number }) | null | undefined
type Relation<T> = number | T | null | undefined

export interface IndexGroupDoc {
  id: number
  name: string
  slug: string
  section?: GroupSection | null
  order?: number | null
  state: PageState
  representative?:
    | { relationTo: 'npcs'; value: Relation<{ name?: string | null; renderRight?: MediaRef }> }
    | { relationTo: 'monsters'; value: Relation<{ name?: string | null; image?: MediaRef }> }
    | null
  guides?: Relation<{ id: number }>[] | null
}

export interface IndexPageDoc {
  id: number
  name: string
  slug: string
  state: PageState
  group?: Relation<{ id: number }>
  achievement?: Relation<{ icon?: MediaRef }>
  quests?:
    | {
        name?: string | null
        quests?: Relation<{ name?: string | null; levelMin?: number | null }>[] | null
      }[]
    | null
}

export interface IndexData {
  groups: IndexGroupDoc[]
  /** Las páginas de logro, en el orden de su metalogro. */
  pages: IndexPageDoc[]
  /** Las guías publicadas de «Otras guías», por su ID. */
  guides: Map<number, { title: string; slug: string }>
}

export interface IndexAchievement {
  name: string
  href?: string
  meta: string
  off: boolean
  icon?: ImageAsset
}

export interface IndexZone {
  name: string
  /** El ancla del panel y de su lista: astrub. */
  anchor: string
  /** En preparación: la etiqueta callada. */
  preparing: boolean
  /** Sin nada publicado: se ve apagada entera, sin panel. */
  off: boolean
  art?: ImageAsset
  /** El icono del primer logro, si no hay representante con imagen. */
  icon?: ImageAsset
  /** El recuento de la ficha: «7 logros», o «230 misiones» si no tiene logros. */
  count: string
  /** El de su cabecera: «7 logros · 50 misiones». */
  counts: string
  /** Sus misiones: las de sus logros y sus guías sueltas. */
  quests: number
  /** «En preparación: 5 de sus 12 logros». */
  prep?: string
  achievements: IndexAchievement[]
  guides: { name: string; href: string }[]
}

export interface IndexView {
  stats: string
  sections: { key: GroupSection; title: string; description: string; zones: IndexZone[] }[]
  search: IndexSearchData
}

const s = metalogrosStrings
const relationId = (value: Relation<{ id: number }>) =>
  value == null ? null : typeof value === 'number' ? value : value.id
const populated = <T extends object>(value: Relation<T>): T | null =>
  value && typeof value === 'object' ? value : null
const asset = (value: MediaRef) => mediaImageAsset(populated(value) as Media | null) ?? undefined
const collator = new Intl.Collator('es', { sensitivity: 'base' })

function levels(page: IndexPageDoc): string | null {
  const known = (page.quests ?? []).flatMap((row) => {
    const found = (row.quests ?? []).flatMap((quest) => populated(quest)?.levelMin ?? [])
    return found.length ? [Math.min(...found)] : []
  })
  if (!known.length) return null
  const [min, max] = [Math.min(...known), Math.max(...known)]
  return min === max ? s.level(min) : s.levels(min, max)
}

function art(group: IndexGroupDoc): ImageAsset | undefined {
  const chosen = group.representative
  if (!chosen) return undefined
  if (chosen.relationTo === 'npcs') return asset(populated(chosen.value)?.renderRight)
  return asset(populated(chosen.value)?.image)
}

/** Lo que pinta el índice de metalogros y lo que busca su buscador. */
export function metalogrosIndexView(data: IndexData): IndexView {
  const byGroup = new Map<number, IndexPageDoc[]>()
  for (const page of data.pages) {
    const id = relationId(page.group)
    if (id !== null) byGroup.set(id, [...(byGroup.get(id) ?? []), page])
  }

  const zones = new Map<number, IndexZone>()
  for (const group of data.groups) {
    const pages = byGroup.get(group.id) ?? []
    const achievements = pages.map((page): IndexAchievement => {
      const off = page.state !== 'published'
      const quests = (page.quests ?? []).length
      const meta = [quests ? s.quests(quests) : '', levels(page) ?? ''].filter(Boolean).join(' · ')
      const icon = asset(populated(page.achievement)?.icon)
      return {
        name: page.name,
        ...(!off && { href: `/${page.slug}` }),
        meta,
        off,
        ...(icon && { icon }),
      }
    })
    const guides = (group.guides ?? []).flatMap((guide) => {
      const found = data.guides.get(relationId(guide) ?? -1)
      return found ? [{ name: found.title, href: `/${found.slug}` }] : []
    })
    const questCount =
      pages.reduce((total, page) => total + (page.quests ?? []).length, 0) + guides.length
    const preparing = group.state !== 'published'
    const ready = achievements.filter((a) => !a.off).length
    const off = preparing && ready === 0 && guides.length === 0
    const counts = [
      achievements.length ? s.achievements(achievements.length) : '',
      questCount ? s.quests(questCount) : '',
    ]
      .filter(Boolean)
      .join(' · ')
    const firstIcon = achievements.find((a) => a.icon)?.icon
    const zoneArt = art(group)
    zones.set(group.id, {
      name: group.name,
      anchor: group.slug.replace(/^metalogro-/, ''),
      preparing,
      off,
      ...(zoneArt ? { art: zoneArt } : firstIcon ? { icon: firstIcon } : {}),
      count: achievements.length
        ? s.achievements(achievements.length)
        : questCount
          ? s.quests(questCount)
          : '',
      counts,
      quests: questCount,
      ...(preparing && {
        prep:
          ready && ready < achievements.length
            ? s.prepPartial(achievements.length - ready, achievements.length)
            : s.preparing,
      }),
      achievements,
      guides,
    })
  }

  const inSection = (key: GroupSection) =>
    data.groups.filter((group) => (group.section ?? 'zones') === key)
  const byOrder = (a: IndexGroupDoc, b: IndexGroupDoc) =>
    (a.order ?? Infinity) - (b.order ?? Infinity) || collator.compare(a.name, b.name)
  const byName = (a: IndexGroupDoc, b: IndexGroupDoc) => collator.compare(a.name, b.name)
  const sections = (['stories', 'zones', 'seasonal'] as const).map((key) => ({
    key,
    title: achievementStrings.sections[key],
    description: s.sectionDescriptions[key],
    zones: inSection(key)
      .sort(key === 'stories' ? byOrder : byName)
      .map((group) => zones.get(group.id)!),
  }))

  const search: IndexSearchData = { z: [], a: [], q: [] }
  const ordered = sections.flatMap((section) => section.zones)
  for (const zone of ordered) {
    search.z.push(
      zone.off ? [zone.name, zone.anchor, zone.counts, 1] : [zone.name, zone.anchor, zone.counts],
    )
  }
  for (const group of data.groups) {
    const zone = zones.get(group.id)!
    for (const page of byGroup.get(group.id) ?? []) {
      const off = zone.off || page.state !== 'published'
      const rows = page.quests ?? []
      const href = `/${page.slug}`
      const index =
        search.a.push(
          off
            ? [page.name, zone.name, href, rows.length, 1]
            : [page.name, zone.name, href, rows.length],
        ) - 1
      rows.forEach((row, position) => {
        const quests = (row.quests ?? []).map(populated).filter((q) => q?.name)
        const name = quests.length === 1 ? quests[0]!.name! : row.name
        if (name) search.q.push([name, position + 1, index])
      })
    }
  }

  const achievementsTotal = ordered.reduce((total, zone) => total + zone.achievements.length, 0)
  const questsTotal = ordered.reduce((total, zone) => total + zone.quests, 0)
  return {
    stats: [s.zones(ordered.length), s.achievements(achievementsTotal), s.quests(questsTotal)].join(
      ' · ',
    ),
    sections,
    search,
  }
}
