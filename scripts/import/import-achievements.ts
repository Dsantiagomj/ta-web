// Lleva a los metalogros y páginas de logro lo que Torre tiene hoy en su web (orden, nombres,
// slugs, estados, representantes elegidos a mano y guías sueltas), desde el índice que
// calculó el prototipo: tmp/mockups/comun/indice/datos.json (datos.mjs y estado.mjs).
// Uso: pnpm import:achievements <datos.json> [--apply] [--remote] [--production]
// Sin --apply solo cuenta. Va después de pnpm data:quests, que crea los metalogros y las
// páginas de los logros con misiones. Escribe en la base de DATABASE_URL (vacía: la de
// pnpm db:dev); contra una base remota pide --remote, y en producción --production.
import { readFile } from 'node:fs/promises'
import { getPayload } from 'payload'

import config from '@payload-config'
import { createDofusDbClient } from '@/lib/dofusdb/client'
import { refreshNpcs } from '@/lib/dofusdb/refresh-npcs'
import type { RawNpc } from '@/lib/dofusdb/types'
import { databaseScriptRefusal } from '@/lib/db/script-guard'

import { importTorreAchievements, type TorreZone } from './load-achievements'

const args = process.argv.slice(2)
const file = args.find((arg) => !arg.startsWith('--'))
if (!file) {
  console.error('Uso: pnpm import:achievements <datos.json> [--apply] [--remote] [--production]')
  process.exit(1)
}
// Antes de arrancar Payload: un entorno equivocado no llega a conectarse.
const refusal = databaseScriptRefusal(process.env, args, 'importar los metalogros de Torre')
if (refusal) {
  console.error(refusal)
  process.exit(1)
}
const apply = args.includes('--apply')
const { zones } = JSON.parse(await readFile(file, 'utf8')) as { zones: TorreZone[] }

const payload = await getPayload({ config })
try {
  const client = createDofusDbClient({ log: (message) => console.log(message) })
  // El representante elegido a mano puede no dar misiones: si falta, se trae con sus renders.
  const ensureNpc = async (dofusId: number) => {
    const find = () =>
      payload.find({
        collection: 'npcs',
        where: { dofusId: { equals: dofusId } },
        depth: 0,
        limit: 1,
        overrideAccess: true,
      })
    const found = (await find()).docs[0]
    if (found) return found.id
    await refreshNpcs(payload, await client.fetchByIds<RawNpc>('npcs', [dofusId]))
    return (await find()).docs[0]?.id ?? null
  }
  const report = await importTorreAchievements(payload, {
    zones,
    apply,
    ensureNpc,
    log: (message) => console.log(message),
  })
  console.log(
    `${apply ? 'Hecho' : 'En seco (sin --apply)'}: ${report.groups.updated} metalogros ` +
      `actualizados y ${report.groups.created} creados; ${report.pages.updated} páginas de ` +
      `logro actualizadas y ${report.pages.created} creadas; ${report.guides} guías sueltas.`,
  )
  for (const { group, name } of report.unmatched) console.log(`Sin casar en ${group}: ${name}`)
  await payload.destroy()
} catch (error) {
  console.error('La importación de los metalogros falló:', error)
  await payload.destroy()
  process.exit(1)
}
