// Corrige la lista de Necesitarás de las guías que DofusDB rellenó sumando cada «Enséñale»
// (El forjador de leyenda guardó 2 × Cocobur; hace falta 1). Solo cambia una lista que sigue
// igual que la rellenó DofusDB; la que Torre cambió se queda y se lista
// (src/lib/guides/shown-items.ts).
// Uso: pnpm guides:shown-items [--apply] [--remote] [--production]
// Sin --apply solo lista lo que cambiaría (en seco). Lee las misiones de DofusDB. Una guía
// cuya última versión está publicada se guarda publicada; si es un borrador, como borrador.
// Escribe en la base de DATABASE_URL (vacía: la de pnpm db:dev); contra una base remota pide
// --remote, y en producción --production. Va después de pnpm data:quests. Contra dev, en seco:
// railway run --service web --environment dev pnpm guides:shown-items --remote
import { getPayload } from 'payload'

import config from '@payload-config'
import { databaseScriptRefusal } from '@/lib/db/script-guard'
import { createDofusDbClient } from '@/lib/dofusdb/client'
import type { RawQuest } from '@/lib/dofusdb/types'
import { backfillShownItems, type NamedRow } from '@/lib/guides/shown-items'

import { runPayloadScript } from './payload-script'

const args = process.argv.slice(2)
// Antes de arrancar Payload: un entorno equivocado no llega a conectarse.
const refusal = databaseScriptRefusal(process.env, args, 'corregir las listas de sus guías')
if (refusal) {
  console.error(refusal)
  process.exit(1)
}
const apply = args.includes('--apply')
const rows = (list: NamedRow[]) =>
  list.map(([name, quantity]) => `${quantity} × ${name}`).join(', ') || 'nada'

await runPayloadScript(
  () => getPayload({ config }),
  async (payload) => {
    console.log('Descargando misiones de DofusDB…')
    const client = createDofusDbClient({ log: (message) => console.log(message) })
    const quests = await client.fetchAll<RawQuest>('quests')
    const result = await backfillShownItems(payload, { apply, quests })
    for (const fix of result.fixes) {
      const draft = fix.status === 'draft' ? ' (borrador)' : ''
      console.log(
        `${apply ? 'Cambiada' : 'Cambiaría'}${draft}: ${fix.slug}: ${rows(fix.from)} → ${rows(fix.to)}`,
      )
    }
    for (const { slug, stored } of result.different) {
      console.log(`Se deja (no es lo que rellenaba DofusDB): ${slug}: ${rows(stored)}`)
    }
    console.log(
      `${result.quests} misiones cambian su lista; ${result.guides} guías suyas leídas, ` +
        `${result.fixes.length} ${apply ? 'corregidas' : 'por corregir'} y ` +
        `${result.different.length} que se dejan.`,
    )
    if (apply) {
      console.log(`Guardadas: ${result.published} publicadas y ${result.drafts} borradores.`)
    } else console.log('En seco: sin --apply no se escribe nada.')
  },
  { label: 'La corrección de lo que se enseña' },
)
