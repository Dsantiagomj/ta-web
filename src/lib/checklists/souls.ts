// Una checklist de almas (el Ocre, «La eterna cosecha»): cada alma que pide la misión, de los
// objetivos que guarda y de sus monstruos, con su nivel, su tipo, su mazmorra, su subzona, su
// región y su etapa. Lo que hacían .build/build_cosecha.py y src/tools/cosecha/souls.js en
// silvestre-checklist, sin ninguna fila escrita a mano. Sin Payload ni React: se prueba solo.
import type { ImageAsset } from '@/components/ui/types'
import { buildBreadcrumb, type BreadcrumbData } from '@/lib/achievements/page'
import { mediaImageAsset } from '@/lib/media/image-asset'
import { fold } from '@/lib/text/fold'
import type { Checklist, Media } from '@/payload-types'

import { populated, type Relation } from './relations'
import { checklistPageStrings as s, soulsStrings as o } from './strings'

export type SoulType = 'boss' | 'archi' | 'other'

export interface SoulMonster {
  name: string
  image?: Relation<Media>
  levels?: number[] | null
  boss?: boolean | null
  archmonster?: boolean | null
  subAreaId?: number | null
}

/** Lo que lee la página de una checklist de almas (src/lib/checklists/queries.ts). */
export interface SoulsData {
  checklist: Checklist
  /** Las etapas de la misión de las almas, con sus objetivos. */
  stages: { objectives?: Objective[] | null }[]
  /** Sus monstruos, por su ID de DofusDB. */
  monsters: Record<number, SoulMonster>
  /** Las subzonas, por su ID de DofusDB. */
  subareas: Record<number, { name: string; areaName?: string | null }>
  /** Las mazmorras de sus jefes, con los jefes por su ID de DofusDB. */
  dungeons: { name: string; level?: number | null; bosses: number[] }[]
  siteUrl: string
}

/** Lo de una checklist de almas que se lee de la base: todo menos la checklist y el origen. */
export type SoulsReadData = Omit<SoulsData, 'checklist' | 'siteUrl'>

type Objective = { kind?: string | null; monsterId?: number | null; [key: string]: unknown }

export interface SoulView {
  id: number
  name: string
  image?: ImageAsset
  level: number | null
  type: SoulType
  dungeon: string | null
  zone: string | null
  region: string | null
  stage: number
  /** Nombre, mazmorra, subzona y región, sin acentos y en minúsculas: el buscador. */
  search: string
}

export interface SoulGroup {
  key: string
  label: string
  souls: number[]
  /** Solo en las etapas: «Jefes» o «Archis», lo que dice el panel de las etapas. */
  kind?: string
}

/** Lo único que recibe la isla: las almas, por su monstruo, y lo que necesita la migración. */
export interface SoulsIslandData {
  checklistId: number
  slug: string
  version: string
  legacy: Checklist['legacy']
  souls: number[]
}

export interface SoulsView {
  id: number
  slug: string
  name: string
  title: string
  description: string
  egg?: ImageAsset
  color?: string
  breadcrumb: BreadcrumbData
  intro: string | null
  notes: { title: string; text: string }[]
  souls: SoulView[]
  stages: SoulGroup[]
  regions: SoulGroup[]
  counts: { total: number } & Record<Exclude<SoulType, 'other'>, number>
  /** Monstruos que la misión pide y no están en la base: sus almas no se pintan. */
  missing: number[]
  island: SoulsIslandData
}

/**
 * El nivel al que se lucha el alma: el grado más alto que cabe en su mazmorra (DofusDB da a
 * algunos jefes grados de nivel 200 en mazmorras de nivel 60) o, sin mazmorra, el más alto. Si
 * ninguno cabe, el último. Null sin grados.
 */
export function soulLevel(levels: number[], dungeonLevel: number | null): number | null {
  if (!levels.length) return null
  const fit = levels.filter((level) => dungeonLevel == null || level <= dungeonLevel)
  return fit.length ? Math.max(...fit) : levels[levels.length - 1]
}

const image = (value: Relation<Media> | undefined) =>
  mediaImageAsset(populated(value ?? null)) ?? undefined

export function soulsView(data: SoulsData): SoulsView {
  const { checklist } = data
  // La mazmorra de cada jefe: la única que lo tiene. Con dos o más no se elige ninguna.
  const dungeonsOf = new Map<number, SoulsData['dungeons']>()
  for (const dungeon of data.dungeons) {
    for (const boss of dungeon.bosses)
      dungeonsOf.set(boss, [...(dungeonsOf.get(boss) ?? []), dungeon])
  }
  const missing: number[] = []
  // Un monstruo que la misión pide más de una vez es una sola alma, en la primera etapa.
  const seen = new Set<number>()
  const souls = data.stages.flatMap((stage, index) =>
    (stage.objectives ?? []).flatMap((objective): SoulView[] => {
      if (objective.kind !== 'bring' || objective.monsterId == null) return []
      const id = objective.monsterId
      if (seen.has(id)) return []
      seen.add(id)
      const monster = data.monsters[id]
      if (!monster) {
        missing.push(id)
        return []
      }
      const dungeons = dungeonsOf.get(id) ?? []
      const dungeon = dungeons.length === 1 ? dungeons[0] : null
      const subarea = monster.subAreaId == null ? undefined : data.subareas[monster.subAreaId]
      const type: SoulType =
        dungeons.length > 0 || monster.boss ? 'boss' : monster.archmonster ? 'archi' : 'other'
      const picture = image(monster.image)
      const soul = {
        id,
        name: monster.name,
        ...(picture && { image: picture }),
        level: soulLevel(monster.levels ?? [], dungeon?.level ?? null),
        type,
        dungeon: dungeon?.name ?? null,
        zone: subarea?.name ?? null,
        region: subarea?.areaName ?? null,
        stage: index + 1,
      }
      return [
        {
          ...soul,
          search: fold([soul.name, soul.dungeon, soul.zone, soul.region].filter(Boolean).join(' ')),
        },
      ]
    }),
  )

  // Por etapas, en el orden de la misión: «Jefes» si todas son de jefe, si no «Archis».
  const stageKeys = [...new Set(souls.map((soul) => soul.stage))]
  const stages = stageKeys.map((stage) => {
    const inStage = souls.filter((soul) => soul.stage === stage)
    const kind = inStage.every((soul) => soul.type === 'boss') ? o.bosses : o.archis
    return {
      key: String(stage),
      label: o.stage(stage, kind),
      kind,
      souls: inStage.map((soul) => soul.id),
    }
  })
  // Por regiones, de la que más almas tiene a la que menos; en empate, por su nombre.
  const regionNames = [...new Set(souls.map((soul) => soul.region ?? o.noRegion))]
  const regions = regionNames
    .map((region) => ({
      key: region,
      label: region,
      souls: souls.filter((soul) => (soul.region ?? o.noRegion) === region).map((soul) => soul.id),
    }))
    .sort((a, b) => b.souls.length - a.souls.length || a.label.localeCompare(b.label, 'es'))

  const guide = populated(checklist.dofusGuide)
  const publishedGuide = guide?.state === 'published' ? guide : null
  const egg = image(populated(guide?.dofus)?.image)
  const title = checklist.name
  return {
    id: checklist.id,
    slug: checklist.slug,
    name: checklist.name,
    title,
    description: checklist.description || o.lead,
    ...(egg && { egg }),
    ...(guide?.color && { color: guide.color }),
    breadcrumb: buildBreadcrumb(
      [
        { name: s.index, href: '/guias-dofus' },
        ...(publishedGuide ? [{ name: publishedGuide.name, href: `/${publishedGuide.slug}` }] : []),
      ],
      { name: title, href: `/${checklist.slug}` },
      data.siteUrl,
    ),
    intro: checklist.prerequisites?.intro ?? null,
    notes: (checklist.prerequisites?.notes ?? []).map(({ title, text }) => ({
      title: title ?? '',
      text,
    })),
    souls,
    stages,
    regions,
    counts: {
      total: souls.length,
      boss: souls.filter((soul) => soul.type === 'boss').length,
      archi: souls.filter((soul) => soul.type === 'archi').length,
    },
    missing,
    island: {
      checklistId: checklist.id,
      slug: checklist.slug,
      version: checklist.updatedAt,
      legacy: checklist.legacy,
      souls: souls.map((soul) => soul.id),
    },
  }
}
