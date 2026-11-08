// Arreglos puntuales sobre los metalogros y las páginas de logro que ya importó
// pnpm import:achievements (la lista está en load-achievement-fixes.ts). Cambia solo esas
// entradas, sin volver a pasar la importación entera, y una segunda pasada no cambia nada.
// Uso: pnpm fix:achievements [--apply] [--remote] [--production]
// Sin --apply solo dice lo que cambiaría. Escribe en la base de DATABASE_URL (vacía: la de
// pnpm db:dev); contra una base remota pide --remote, y en producción --production.
import { getPayload } from 'payload'

import config from '@payload-config'
import { databaseScriptRefusal } from '@/lib/db/script-guard'

import { npcEnsurer } from './ensure-npc'
import { applyAchievementFixes, TORRE_FIXES } from './load-achievement-fixes'

const args = process.argv.slice(2)
// Antes de arrancar Payload: un entorno equivocado no llega a conectarse.
const refusal = databaseScriptRefusal(process.env, args, 'arreglar los metalogros de Torre')
if (refusal) {
  console.error(refusal)
  process.exit(1)
}
const apply = args.includes('--apply')

const payload = await getPayload({ config })
try {
  const report = await applyAchievementFixes(payload, {
    fixes: TORRE_FIXES,
    apply,
    ensureNpc: npcEnsurer(payload, (message) => console.log(message)),
  })
  console.log(apply ? 'Hecho:' : 'En seco (sin --apply), cambiaría:')
  for (const change of report.changes) console.log(`  ${change}`)
  if (report.changes.length === 0) console.log('  nada: ya está todo como en la lista')
  for (const skipped of report.skipped) console.log(`Sin tocar: ${skipped}`)
  await payload.destroy()
} catch (error) {
  console.error('Los arreglos de los metalogros fallaron:', error)
  await payload.destroy()
  process.exit(1)
}
