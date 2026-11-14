// Trae el arte de las tarjetas del índice /checklists desde una copia de silvestre-checklist:
// la escena, el PNJ y su encuadre de cada checklist del hub antiguo (`card` en
// scripts/import/checklists/catalog.ts) y la escena y el huevo de la tarjeta «???». Sube cada
// imagen a Media una vez y, al repetirla, no pisa lo que Torre haya cambiado en el panel
// (scripts/import/checklists/cards.ts). Las checklists tienen que estar ya importadas.
// Uso: pnpm import:checklist-cards --from <silvestre-checklist> [--apply] [--remote] [--production]
// Sin --apply solo cuenta y avisa: no escribe nada. Escribe en la base de DATABASE_URL (vacía:
// la de pnpm db:dev); contra una base remota pide --remote, y en producción --production.
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { getPayload } from 'payload'

import config from '@payload-config'
import { databaseScriptRefusal } from '@/lib/db/script-guard'

import { checklistArt } from './checklists/art'
import { loadChecklistCards, TEASER_ART, type CardImportEntry } from './checklists/cards'
import { CHECKLIST_CATALOG } from './checklists/catalog'

const USAGE =
  'Uso: pnpm import:checklist-cards --from <silvestre-checklist> [--apply] [--remote] [--production]'

const args = process.argv.slice(2)
const fromAt = args.indexOf('--from')
const from = fromAt === -1 ? null : args[fromAt + 1]
if (!from || from.startsWith('--')) {
  console.error(USAGE)
  process.exit(1)
}
// Antes de arrancar Payload: un entorno equivocado no llega a conectarse.
const refusal = databaseScriptRefusal(process.env, args, 'importar las tarjetas de las checklists')
if (refusal) {
  console.error(refusal)
  process.exit(1)
}
const apply = args.includes('--apply')

const entries: CardImportEntry[] = CHECKLIST_CATALOG.flatMap((entry) =>
  entry.card ? [{ slug: entry.slug, name: entry.name, card: entry.card }] : [],
)
const readArt = (file: string) => readFile(path.join(from, 'public', 'img', file)).catch(() => null)

const payload = await getPayload({ config })
try {
  const report = await loadChecklistCards(payload, {
    entries,
    teaser: TEASER_ART,
    apply,
    art: checklistArt(payload, { readArt, dryRun: !apply }),
    log: (message) => console.log(message),
  })
  for (const slug of report.renamed) {
    console.log(`${slug}: ${apply ? 'pasa' : 'pasaría'} a llamarse como en el hub`)
  }
  for (const slug of report.missing) {
    console.log(`${slug}: no está en la base. Corre antes pnpm import:checklists.`)
  }
  for (const file of report.missingArt) {
    console.log(`No está en la copia de silvestre-checklist: public/img/${file}`)
  }
  for (const { slug, field } of report.kept) {
    console.log(`Se respeta lo que cambió Torre en ${slug}: ${field}`)
  }
  console.log(
    `${apply ? 'Hecho' : 'En seco (sin --apply)'}: ${report.updated.length} tarjetas ` +
      `${apply ? 'actualizadas' : 'por actualizar'}, ${report.unchanged.length} sin cambios; ` +
      `tarjeta «???»: ${{ updated: apply ? 'actualizada' : 'por actualizar', unchanged: 'sin cambios', skipped: 'sin tocar' }[report.teaser]}.` +
      ` ${apply ? 'Subidas' : 'Se subirían'} ${report.pendingArt} imágenes a Media.`,
  )
  await payload.destroy()
} catch (error) {
  console.error('La importación de las tarjetas falló:', error)
  await payload.destroy()
  process.exit(1)
}
