// Lleva a checklists las checklists de Torre desde una copia de silvestre-checklist: las
// portadas (hoy el Nebuloso) enteras, en borrador y En preparación; las demás como fichas En
// preparación que enlazan a Squarespace (scripts/import/checklists/catalog.ts). Al repetirla
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
import { CHECKLIST_CATALOG } from './checklists/catalog'
import { readLegacyChecklist } from './checklists/legacy'
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
const checklists: ChecklistInput[] = []
for (const entry of selected) {
  const draft = entry.ported
    ? toChecklistDraft(entry, await readLegacyChecklist(from, entry.id))
    : null
  checklists.push({ entry, draft })
}

const log = (message: string) => console.log(message)
const readArt = (file: string) => readFile(path.join(from, 'public', 'img', file)).catch(() => null)

/** Cómo se resuelven objetos, PNJ e imágenes: en seco solo se busca, sin escribir. */
function resolvers(payload: Payload, dryRun: boolean) {
  const client = createDofusDbClient({ log })
  const items = gameItems(payload, { client, log, dryRun })
  const art = checklistArt(payload, { readArt, dryRun })
  const ensureNpc = npcEnsurer(payload, log)
  return {
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
}

function printUnmatched(report: LoadChecklistsReport) {
  if (report.unmatched.length === 0) {
    console.log('Sin casar: nada. No se queda fuera ninguna misión, logro, PNJ, jefe ni imagen.')
  } else {
    console.log('Sin casar (se queda fuera de la checklist):')
    for (const { slug, step, kind, name } of report.unmatched) {
      console.log(`  ${slug}${step === null ? '' : `, paso ${step}`}: ${kind} «${name}»`)
    }
  }
  // Ninguna fila de «Necesitarás» se pierde: la que no es un objeto del juego va como texto.
  if (report.labels.length > 0) {
    console.log('Se guardan como texto, sin objeto del juego (no se pierde ninguna fila):')
    for (const { slug, step, name } of report.labels) {
      console.log(`  ${slug}, paso ${step}: «${name}»`)
    }
  }
}

const payload = await getPayload({ config })
try {
  const htmlToLexical = await createHtmlToLexical(payload.config)

  // Primero en seco, siempre: lo que no casa se ve antes de escribir nada.
  const plan = await loadChecklists(payload, {
    checklists,
    apply: false,
    htmlToLexical,
    ...resolvers(payload, true),
  })
  printUnmatched(plan)
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
        ...resolvers(payload, false),
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
