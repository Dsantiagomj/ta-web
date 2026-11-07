// Trae todas las misiones de DofusDB, con los monstruos que nombran, sus zonas y logros, y
// todo el catálogo de objetos, y los guarda en quests, items y monsters, sin duplicar.
// Luego guarda las categorías de logros y los logros de misiones y eventos, con sus iconos.
// Luego guarda los PNJ que dan las misiones en npcs e importa sus renders a Media, solo
// los que aún no están (la primera vez tarda: dos imágenes por PNJ), y los iconos de los
// objetos y las imágenes de los monstruos que pinta alguna guía, también una sola vez.
// Uso: pnpm data:quests. Escribe en la base de DATABASE_URL (vacía: la de pnpm db:dev).
// DOFUSDB_WRITE_CONCURRENCY fija cuántas escrituras van a la vez (por defecto 8).
// Corre con `payload run`, que carga .env y transpila TypeScript; el script arranca
// Payload por su cuenta.
import { getPayload } from 'payload'

import config from '@payload-config'
import { createDofusDbClient } from '@/lib/dofusdb/client'
import { fetchQuestData } from '@/lib/dofusdb/fetch-quest-data'
import { gameImageTargets, refreshGameImages } from '@/lib/dofusdb/game-images'
import { refreshAchievements } from '@/lib/dofusdb/refresh-achievements'
import { refreshNpcs } from '@/lib/dofusdb/refresh-npcs'
import {
  refreshQuests,
  type UpsertCounts,
  writeConcurrencyFromEnv,
} from '@/lib/dofusdb/refresh-quests'

// Antes de arrancar Payload: un valor mal escrito falla en el acto.
const concurrency = writeConcurrencyFromEnv(process.env)
const started = Date.now()
const seconds = (from = started) => ((Date.now() - from) / 1000).toFixed(1)

const payload = await getPayload({ config })
try {
  console.log('Descargando misiones de DofusDB…')
  const data = await fetchQuestData(createDofusDbClient({ log: (message) => console.log(message) }))
  console.log(
    `DofusDB: ${data.quests.length} misiones, ${data.npcs.length} PNJ, ${data.mapPositions.length} mapas, ` +
      `${data.subAreas?.length ?? 0} subzonas, ${data.areas?.length ?? 0} áreas, ` +
      `${data.achievements?.length ?? 0} logros en ${data.achievementCategories?.length ?? 0} categorías, ` +
      `${data.items.length} objetos y ${data.monsters.length} monstruos (${seconds()} s)`,
  )

  console.log(`Guardando con ${concurrency} escrituras a la vez…`)
  const writeStarted = Date.now()
  const counts = await refreshQuests(payload, data, {
    concurrency,
    log: (message) => console.log(message),
  })
  console.log(`Escritura: ${seconds(writeStarted)} s.`)

  console.log('Guardando los logros de misiones y eventos e importando sus iconos…')
  const achievementsStarted = Date.now()
  const achievementCounts = await refreshAchievements(
    payload,
    { achievements: data.achievements ?? [], categories: data.achievementCategories ?? [] },
    { concurrency, log: (message) => console.log(message) },
  )
  console.log(`Logros: ${seconds(achievementsStarted)} s.`)

  console.log('Guardando los PNJ e importando sus renders…')
  const npcsStarted = Date.now()
  const npcCounts = await refreshNpcs(payload, data.npcs, {
    log: (message) => console.log(message),
  })
  console.log(`PNJ: ${seconds(npcsStarted)} s.`)

  console.log('Importando los iconos de los objetos y las imágenes de los monstruos…')
  const imagesStarted = Date.now()
  const targets = await gameImageTargets(payload)
  const images = await refreshGameImages(payload, {
    ...targets,
    log: (message) => console.log(message),
  })
  console.log(`Imágenes: ${seconds(imagesStarted)} s.`)
  // `ending` concuerda con el género: misiones creadas, objetos creados.
  const summary = (label: string, ending: 'as' | 'os', counts: UpsertCounts) =>
    `${label}: ${counts.created} cread${ending}, ${counts.updated} actualizad${ending}, ` +
    `${counts.unchanged} sin cambios.`
  console.log(`Listo en ${seconds()} s.`)
  console.log(summary('Misiones', 'as', counts.quests))
  console.log(summary('Objetos', 'os', counts.items))
  console.log(summary('Monstruos', 'os', counts.monsters))
  console.log(summary('Categorías de logros', 'as', achievementCounts.categories))
  console.log(summary('Logros', 'os', achievementCounts.achievements))
  console.log(
    `Iconos de logros: ${achievementCounts.icons.imported} importados, ` +
      `${achievementCounts.icons.reused} recuperados de Media y ${achievementCounts.icons.failed} sin icono. ` +
      `Omitidas en los logros: ${achievementCounts.missingQuests} misiones y ` +
      `${achievementCounts.missingItems} objetos que no existen.`,
  )
  console.log(summary('PNJ', 'os', npcCounts.npcs))
  console.log(
    `Renders de PNJ: ${npcCounts.renders.imported} importados, ${npcCounts.renders.reused} ` +
      `recuperados de Media y ${npcCounts.renders.failed} sin render.`,
  )
  console.log(
    `Imágenes de objetos y monstruos: ${images.imported} importadas, ${images.reused} ` +
      `recuperadas de Media, ${images.linked} enlazadas, ${images.unchanged} sin cambios y ` +
      `${images.failed} sin imagen.`,
  )
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
