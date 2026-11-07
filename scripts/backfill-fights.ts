// Convierte los combates de las guías ya importadas: las listas «N x Monstruo» después de
// «lucha contra» pasan a un bloque Combate con los monstruos de DofusDB, como hace ahora
// `pnpm import:guides`, e importa las imágenes de esos monstruos. Lo que no casa con un
// monstruo se queda en texto y sale en el resumen. Se puede repetir: lo convertido ya no está.
// Uso: pnpm guides:fights [--apply] [--remote] [--production]
// Sin --apply solo cuenta (en seco). Escribe en la base de DATABASE_URL (vacía: la de
// pnpm db:dev); contra una base remota pide --remote, y en producción --production.
// Corre con `payload run`, como scripts/refresh-quests.ts. Va después de pnpm data:quests,
// que trae todo el catálogo de monstruos.
import { getPayload } from 'payload'

import config from '@payload-config'
import { databaseScriptRefusal } from '@/lib/db/script-guard'
import { backfillFightLists } from '@/lib/guides/backfill-fights'

const args = process.argv.slice(2)
// Antes de arrancar Payload: un entorno equivocado no llega a conectarse.
const refusal = databaseScriptRefusal(process.env, args, 'convertir los combates de sus guías')
if (refusal) {
  console.error(refusal)
  process.exit(1)
}
const apply = args.includes('--apply')

const started = Date.now()
const payload = await getPayload({ config })
try {
  const result = await backfillFightLists(payload, {
    apply,
    log: (message) => console.log(message),
  })
  const seconds = ((Date.now() - started) / 1000).toFixed(1)
  const names = Object.entries(result.unmatched).sort((a, b) => b[1] - a[1])
  for (const [name, count] of names) console.log(`Sin casar: ${name} (${count})`)
  console.log(
    `${apply ? 'Listo' : 'En seco (sin --apply no se escribe nada)'} en ${seconds} s: ` +
      `${result.guides} guías leídas, ${result.changed} con combates; ${result.converted} listas ` +
      `${apply ? 'convertidas' : 'por convertir'}, ${result.unmatchedLists} sin casar (${names.length} nombres) y ` +
      `${result.skipped} saltadas por no tener la forma «N x Nombre».`,
  )
  if (apply) {
    console.log(`Guardadas: ${result.published} publicadas y ${result.drafts} borradores.`)
    const images = result.images
    if (images) {
      console.log(
        `Imágenes de monstruos: ${images.imported} importadas, ${images.reused} recuperadas, ` +
          `${images.linked} enlazadas y ${images.failed} sin imagen.`,
      )
    }
  }
  await payload.destroy()
} catch (error) {
  console.error('La conversión de los combates falló:', error)
  await payload.destroy()
  // `payload run` sale con 0 cuando el script termina sin lanzar: el fallo se marca aquí.
  process.exit(1)
}
