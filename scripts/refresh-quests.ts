// Trae todas las misiones de DofusDB, con los objetos y monstruos que nombran, y las
// guarda en quests, items y monsters, sin duplicar.
// Uso: pnpm data:quests. Escribe en la base de DATABASE_URL (vacía: la de pnpm db:dev).
// Corre con `payload run`, que carga .env y transpila TypeScript; el script arranca
// Payload por su cuenta.
import { getPayload } from 'payload'

import config from '@payload-config'
import { createDofusDbClient } from '@/lib/dofusdb/client'
import { fetchQuestData } from '@/lib/dofusdb/fetch-quest-data'
import { refreshQuests, type UpsertCounts } from '@/lib/dofusdb/refresh-quests'

const started = Date.now()
const seconds = () => ((Date.now() - started) / 1000).toFixed(1)

const payload = await getPayload({ config })
try {
  console.log('Descargando misiones de DofusDB…')
  const data = await fetchQuestData(createDofusDbClient())
  console.log(
    `DofusDB: ${data.quests.length} misiones, ${data.npcs.length} PNJ, ${data.mapPositions.length} mapas, ` +
      `${data.items.length} objetos y ${data.monsters.length} monstruos (${seconds()} s)`,
  )

  const counts = await refreshQuests(payload, data, { log: (message) => console.log(message) })
  // `ending` concuerda con el género: misiones creadas, objetos creados.
  const summary = (label: string, ending: 'as' | 'os', counts: UpsertCounts) =>
    `${label}: ${counts.created} cread${ending}, ${counts.updated} actualizad${ending}, ` +
    `${counts.unchanged} sin cambios.`
  console.log(`Listo en ${seconds()} s.`)
  console.log(summary('Misiones', 'as', counts.quests))
  console.log(summary('Objetos', 'os', counts.items))
  console.log(summary('Monstruos', 'os', counts.monsters))
  console.log(
    `Referencias omitidas: ${counts.missingPrerequisites} prerrequisitos, ` +
      `${counts.missingItems} objetos y ${counts.missingMonsters} monstruos que no existen.`,
  )
  await payload.destroy()
} catch (error) {
  console.error('El refresco de misiones falló:', error)
  await payload.destroy()
  // `payload run` sale con 0 cuando el script termina sin lanzar: el fallo se marca aquí.
  process.exit(1)
}
