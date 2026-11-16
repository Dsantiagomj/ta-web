import type { Payload } from 'payload'

import { indexTextDefaults, navigationDefaults, siteSettingsDefaults } from './defaults'
import { navigationSeed } from './navigation'
import { copyFills, withDefaults } from './resolve'
import { siteCopyStrings } from './strings'

// pnpm seed:site-copy (scripts/seed-site-copy.ts): escribe en «Ajustes del sitio», «Portada e
// índices» y «Navegación» el texto de siempre en cada campo vacío, para que Torre lo vea en el
// panel y lo cambie. Lo que ya escribió no se toca, así que repetirla no cambia nada.

type SiteCopyGlobal = 'site-settings' | 'index-texts' | 'navigation'

const GLOBALS: { global: SiteCopyGlobal; label: string; defaults: object }[] = [
  {
    global: 'site-settings',
    label: siteCopyStrings.settings.label,
    defaults: siteSettingsDefaults,
  },
  { global: 'index-texts', label: siteCopyStrings.indexes.label, defaults: indexTextDefaults },
]

export interface SeedPlan {
  global: SiteCopyGlobal
  label: string
  /** Los campos vacíos, con el texto que reciben. */
  fills: { path: string; value: string }[]
  /**
   * Nadie lo guardó todavía: Payload lo lee con el valor de partida de cada campo, pero no
   * hay fila. Se guarda entero, para que el texto quede en la base.
   */
  unsaved: boolean
  /** Lo que la carga no pudo hacer (una guía de Dofus que no está). */
  notes?: string[]
}

/** «Navegación»: las secciones y, sin destacados elegidos, los tres Dofus de siempre. */
async function seedNavigation(payload: Payload, apply: boolean): Promise<SeedPlan> {
  const stored = await payload.findGlobal({ slug: 'navigation', depth: 0, overrideAccess: true })
  const unsaved = !stored?.createdAt
  const { docs: guides } = await payload.find({
    collection: 'dofus-guides',
    where: { slug: { in: navigationDefaults.featuredDofus } },
    select: { slug: true, name: true },
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  const { fills, notes, data } = navigationSeed(unsaved ? {} : stored, guides)
  if (apply && fills.length) {
    await payload.updateGlobal({ slug: 'navigation', data, overrideAccess: true })
  }
  return { global: 'navigation', label: siteCopyStrings.navigation.label, fills, unsaved, notes }
}

export async function seedSiteCopy(
  payload: Payload,
  { apply }: { apply: boolean },
): Promise<SeedPlan[]> {
  const plans: SeedPlan[] = []
  for (const { global, label, defaults } of GLOBALS) {
    const stored = await payload.findGlobal({ slug: global, depth: 0, overrideAccess: true })
    const unsaved = !stored.createdAt
    const fills = copyFills(defaults, unsaved ? {} : stored)
    plans.push({ global, label, fills, unsaved })
    if (!apply || !fills.length) continue
    // Todos los textos, con lo escrito tal cual: los campos que no son texto (la imagen al
    // compartir) no van en `data` y Payload los deja como estaban.
    await payload.updateGlobal({
      slug: global,
      data: withDefaults(defaults, stored) as Record<string, unknown>,
      overrideAccess: true,
    })
  }
  plans.push(await seedNavigation(payload, apply))
  return plans
}

export function seedReport(plans: SeedPlan[], apply: boolean): string[] {
  const lines = apply ? [] : ['En seco: no se escribe nada. Repite con --apply para escribir.']
  for (const { label, fills, unsaved, notes = [] } of plans) {
    for (const note of notes) lines.push(`${label}: ${note}`)
    if (!fills.length) {
      lines.push(`${label}: nada que llenar.`)
      continue
    }
    if (unsaved) {
      const verb = apply ? 'guardó' : 'guardaría'
      lines.push(
        `${label}: sin guardar todavía; ${verb} el texto de siempre en ${fills.length} campos:`,
      )
    } else {
      const count = fills.length === 1 ? '1 campo vacío' : `${fills.length} campos vacíos`
      lines.push(`${label}: ${apply ? 'llenó' : 'llenaría'} ${count}:`)
    }
    for (const { path, value } of fills) lines.push(`  ${path}: «${value}»`)
  }
  return lines
}
