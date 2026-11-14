// Lleva a checklists las checklists de Torre desde una copia de silvestre-checklist: las
// portadas (`ported` en scripts/import/checklists/catalog.ts) enteras, en borrador y En
// preparación; el Ocre, de almas, sale de su misión y sus monstruos; las demás, como fichas En
// preparación que enlazan a Squarespace. Al repetirla
// no pisa lo que Torre haya cambiado en el panel y cada paso conserva su stepId (load.ts).
// Trae de DofusDB los objetos y PNJ que falten, con su icono o sus renders, y sube a Media
// los mapas de inicio, las zonas y las figuras que no son PNJ.
// Uso: pnpm import:checklists --from <silvestre-checklist> [--only <id>] [--apply] [--remote] [--production]
// Antes de escribir imprime lo que no casa. Sin --apply solo cuenta y avisa: no escribe nada.
// Escribe en la base de DATABASE_URL (vacía: la de pnpm db:dev); contra una base remota pide
// --remote, y en producción --production.
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { getPayload, type Payload } from 'payload'

import config from '@payload-config'
import { databaseScriptRefusal } from '@/lib/db/script-guard'
import { createDofusDbClient } from '@/lib/dofusdb/client'
import type { RawNpc } from '@/lib/dofusdb/types'

import { checklistArt } from './checklists/art'
import { CHECKLIST_CATALOG, hasLegacySteps } from './checklists/catalog'
import { genericAlternatives, genericSource } from './checklists/generic'
import { readLegacyChecklist, type LegacyChecklist } from './checklists/legacy'
import {
  loadChecklists,
  type ChecklistInput,
  type LoadChecklistsOptions,
  type LoadChecklistsReport,
} from './checklists/load'
import { toChecklistDraft } from './checklists/to-checklist'
import { gameItems } from './dofus-guides/game-items'
import { npcEnsurer } from './ensure-npc'
import { createHtmlToLexical } from './rich-text'

const USAGE =
  'Uso: pnpm import:checklists --from <silvestre-checklist> [--only <id>] [--apply] [--remote] [--production]'

const args = process.argv.slice(2)
const option = (name: string): string | null => {
  const index = args.indexOf(name)
  if (index === -1) return null
  const value = args[index + 1]
  if (!value || value.startsWith('--')) {
    console.error(USAGE)
    process.exit(1)
  }
  return value
}
const from = option('--from')
const only = option('--only')
if (!from) {
  console.error(USAGE)
  process.exit(1)
}
const selected = CHECKLIST_CATALOG.filter((entry) => !only || entry.id === only)
if (selected.length === 0) {
  console.error(
    `No hay ninguna checklist «${only}». Son: ${CHECKLIST_CATALOG.map((e) => e.id).join(', ')}`,
  )
  process.exit(1)
}
// Antes de arrancar Payload: un entorno equivocado no llega a conectarse.
const refusal = databaseScriptRefusal(process.env, args, 'importar las checklists')
if (refusal) {
  console.error(refusal)
  process.exit(1)
}
const apply = args.includes('--apply')

// Los datos antiguos se leen y se convierten antes de tocar la base: un paso que no cuadra
// para aquí, sin escribir nada.
// Las filas genéricas («Misión de clase», «Recolección en…») van con sus misiones, que salen de
// DofusDB (generic.ts).
const checklists: ChecklistInput[] = []
const dofusDb = createDofusDbClient({ log: (message: string) => console.log(message) })
const legacies = new Map<string, LegacyChecklist>()
for (const entry of selected) {
  if (hasLegacySteps(entry)) legacies.set(entry.id, await readLegacyChecklist(from, entry.id))
}
// Las de todas las checklists de una vez: varias comparten fila (la de alineamiento).
const genericIds = [...legacies.values()].flatMap((legacy) =>
  Object.values(legacy.quests.STEP_QUESTS)
    .flat()
    .map(String)
    .filter((id) => genericSource(id) !== null),
)
const alternatives = await genericAlternatives(dofusDb, [...new Set(genericIds)])
for (const entry of selected) {
  const legacy = legacies.get(entry.id)
  checklists.push({
    entry,
    draft: legacy ? toChecklistDraft(entry, legacy, alternatives) : null,
  })
}

const log = (message: string) => console.log(message)
const readArt = (file: string) => readFile(path.join(from, 'public', 'img', file)).catch(() => null)

/** Cómo se resuelven objetos, PNJ e imágenes: en seco solo se busca, sin escribir. */
function resolvers(payload: Payload, dryRun: boolean) {
  const client = createDofusDbClient({ log })
  const items = gameItems(payload, { client, log, dryRun })
  const art = checklistArt(payload, { readArt, dryRun })
  const ensureNpc = npcEnsurer(payload, log)
  const options = {
    ensureItem: items.ensureItem,
    findItem: items.findItem,
    artFor: art.media,
    ensureNpc: async (dofusId: number): Promise<number | null> => {
      if (!dryRun) return ensureNpc(dofusId)
      const { docs } = await payload.find({
        collection: 'npcs',
        where: { dofusId: { equals: dofusId } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      if (docs[0]) return docs[0].id
      const [raw] = await client.fetchByIds<RawNpc>('npcs', [dofusId])
      return raw ? -dofusId : null
    },
  } satisfies Partial<LoadChecklistsOptions>
  return { options, singularMatches: items.singularMatches }
}

/** Las checklists de almas: cuántas pide su misión y las que no se pueden pintar aún. */
function printSouls(report: LoadChecklistsReport) {
  const ids = (list: number[]) =>
    list.length > 8 ? `${list.slice(0, 8).join(', ')}…` : list.join(', ')
  for (const { slug, souls, missingMonsters, withoutGameData, notSouls } of report.souls) {
    console.log(`${slug}: ${souls} almas.`)
    if (missingMonsters.length > 0) {
      console.log(
        `  ${missingMonsters.length} sin monstruo en la base (se quedan fuera): ${ids(missingMonsters)}`,
      )
    }
    if (withoutGameData.length > 0) {
      console.log(
        `  ${withoutGameData.length} sin nivel o subzona: corre pnpm data:quests antes de publicarla (${ids(withoutGameData)})`,
      )
    }
    if (notSouls > 0)
      console.log(`  ${notSouls} objetivos de llevar algo que no es un alma, fuera.`)
  }
}

function printUnmatched(report: LoadChecklistsReport) {
  const where = (step: number | null) =>
    step === null ? '' : step === 0 ? ', prerrequisitos' : `, paso ${step}`
  const missing = report.unmatched.filter((row) => row.kind !== 'parada')
  if (missing.length === 0) {
    console.log('Sin casar: nada. No se queda fuera ninguna misión, logro, PNJ, jefe ni imagen.')
  } else {
    console.log('Sin casar (se queda fuera de la checklist):')
    for (const { slug, step, kind, name } of missing) {
      console.log(`  ${slug}${where(step)}: ${kind} «${name}»`)
    }
  }
  // Un rojo que la checklist antigua no situaba en ninguna misión: se guarda como aviso.
  const stops = report.unmatched.filter((row) => row.kind === 'parada')
  if (stops.length > 0) {
    console.log('«Detente aquí» sin misión donde parar (se guarda el texto, solo avisa):')
    for (const { slug, step, name } of stops) console.log(`  ${slug}${where(step)}: «${name}»`)
  }
  // Ninguna fila de «Necesitarás» se pierde: la que no es un objeto del juego va como texto.
  if (report.labels.length > 0) {
    console.log('Se guardan como texto, sin objeto del juego (no se pierde ninguna fila):')
    for (const { slug, step, name } of report.labels) {
      console.log(`  ${slug}${where(step)}: «${name}»`)
    }
  }
}

const payload = await getPayload({ config })
try {
  const htmlToLexical = await createHtmlToLexical(payload.config)

  // Primero en seco, siempre: lo que no casa se ve antes de escribir nada.
  const dry = resolvers(payload, true)
  const plan = await loadChecklists(payload, {
    checklists,
    apply: false,
    htmlToLexical,
    ...dry.options,
  })
  printUnmatched(plan)
  // Los nombres en plural que casaron con un objeto en singular, para revisarlos.
  for (const { name, item } of dry.singularMatches()) {
    console.log(`Casado en singular: «${name}» → «${item}»`)
  }
  printSouls(plan)
  console.log(
    `Se traerían de DofusDB ${plan.pending.items} objetos, ${plan.pending.npcs} PNJ y ` +
      `${plan.pending.icons} iconos de objetos que no lo tienen, y se subirían ` +
      `${plan.pending.art} imágenes de la checklist antigua a Media.`,
  )

  const report = apply
    ? await loadChecklists(payload, {
        checklists,
        apply: true,
        htmlToLexical,
        ...resolvers(payload, false).options,
        log,
      })
    : plan
  console.log(
    `${apply ? 'Hecho' : 'En seco (sin --apply)'}: ${report.created} creadas, ` +
      `${report.updated} actualizadas, ${report.unchanged} sin cambios.`,
  )
  for (const { slug, field } of report.kept) {
    console.log(`Se respeta lo que cambió Torre en ${slug}: ${field}`)
  }
  await payload.destroy()
} catch (error) {
  console.error('La importación de las checklists falló:', error)
  await payload.destroy()
  process.exit(1)
}
