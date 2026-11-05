// Genera las variantes AVIF y WebP que les faltan a los archivos de media: los subidos
// antes de que Payload las generara al subir. Vuelve a subir cada original a través de
// Payload con el mismo nombre, así que las variantes acaban junto a él (R2 o disco).
// Lo que ya tiene sus variantes no se toca: se puede repetir sin coste.
// Uso: pnpm media:sizes [--remote] [--production]
// Escribe en la base de DATABASE_URL (vacía: la de pnpm db:dev). Contra una base remota
// pide --remote, y en producción --production. Corre con `payload run`, como
// scripts/refresh-quests.ts.
import { getPayload } from 'payload'

import config from '@payload-config'
import { regenerateImageSizes, regenerationRefusal } from '@/lib/media/regenerate'

// Antes de arrancar Payload: un entorno equivocado no llega a conectarse.
const refusal = regenerationRefusal(process.env, process.argv.slice(2))
if (refusal) {
  console.error(refusal)
  process.exit(1)
}

const started = Date.now()
const payload = await getPayload({ config })
try {
  const result = await regenerateImageSizes(payload, { log: (message) => console.log(message) })
  const seconds = ((Date.now() - started) / 1000).toFixed(1)
  console.log(
    `Listo en ${seconds} s: ${result.regenerated.length} archivos con variantes nuevas, ` +
      `${result.complete} ya completos, ${result.failed.length} fallidos.`,
  )
  await payload.destroy()
  // `payload run` sale con 0 cuando el script termina sin lanzar: el fallo se marca aquí.
  if (result.failed.length > 0) process.exit(1)
} catch (error) {
  console.error('La regeneración de variantes falló:', error)
  await payload.destroy()
  process.exit(1)
}
