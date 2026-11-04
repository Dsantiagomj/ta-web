// Trae todas las misiones de DofusDB y las guarda en la colección quests, sin duplicar.
// Uso: pnpm data:quests. Escribe en la base de DATABASE_URL (vacía: la de pnpm db:dev).
// Corre con `payload run`, que carga .env y transpila TypeScript; el script arranca
// Payload por su cuenta.
import { getPayload } from 'payload'

import config from '@payload-config'
import { createDofusDbClient } from '@/lib/dofusdb/client'
import { fetchQuestData } from '@/lib/dofusdb/fetch-quest-data'
import { refreshQuests } from '@/lib/dofusdb/refresh-quests'

const started = Date.now()
const seconds = () => ((Date.now() - started) / 1000).toFixed(1)

const payload = await getPayload({ config })
try {
  console.log('Descargando misiones de DofusDB…')
  const data = await fetchQuestData(createDofusDbClient())
  console.log(
    `DofusDB: ${data.quests.length} misiones, ${data.npcs.length} PNJ y ${data.mapPositions.length} mapas (${seconds()} s)`,
  )

  const counts = await refreshQuests(payload, data, { log: (message) => console.log(message) })
  console.log(
    `Listo en ${seconds()} s: ${counts.created} creadas, ${counts.updated} actualizadas, ` +
      `${counts.unchanged} sin cambios, ${counts.missingPrerequisites} prerrequisitos sin misión.`,
  )
  await payload.destroy()
} catch (error) {
  console.error('El refresco de misiones falló:', error)
  await payload.destroy()
  // `payload run` sale con 0 cuando el script termina sin lanzar: el fallo se marca aquí.
  process.exit(1)
}
