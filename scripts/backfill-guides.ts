// Pone al día las guías importadas antes de dos cambios del importador, como las dejaría
// ahora `pnpm import:guides`:
// 1. La frase de cierre («Aquí termina la misión.»), que el importador quitaba, vuelve al
//    principio del final, leída de la página guardada en la carpeta del inventario.
// 2. Las listas «N x Monstruo» después de «lucha contra» pasan a un bloque Combate con los
//    monstruos de DofusDB, y se importan las imágenes de esos monstruos.
// Lo que no casa se queda como está y sale en el resumen. Se puede repetir: lo hecho ya no cambia.
// Uso: pnpm guides:backfill <carpeta de la migración> [--apply] [--remote] [--production]
// Sin --apply solo cuenta (en seco). Una guía cuya última versión está publicada se guarda
// publicada; si es un borrador, como borrador. Escribe en la base de DATABASE_URL (vacía: la
// de pnpm db:dev); contra una base remota pide --remote, y en producción --production. Va
// después de pnpm data:quests, que trae todo el catálogo de monstruos.
import { getPayload } from 'payload'

import config from '@payload-config'
import { databaseScriptRefusal } from '@/lib/db/script-guard'
import { backfillFightLists } from '@/lib/guides/backfill-fights'

import { restoreClosings } from './import/restore-closings'

const args = process.argv.slice(2)
const dir = args.find((arg) => !arg.startsWith('--'))
if (!dir) {
  console.error(
    'Uso: pnpm guides:backfill <carpeta de la migración> [--apply] [--remote] [--production]',
  )
  process.exit(1)
}
// Antes de arrancar Payload: un entorno equivocado no llega a conectarse.
const refusal = databaseScriptRefusal(process.env, args, 'poner al día sus guías')
if (refusal) {
  console.error(refusal)
  process.exit(1)
}
const apply = args.includes('--apply')
const log = (message: string) => console.log(message)

const started = Date.now()
const payload = await getPayload({ config })
try {
  const closings = await restoreClosings(payload, { dir, apply, log })
  const fights = await backfillFightLists(payload, { apply, log })
  const seconds = ((Date.now() - started) / 1000).toFixed(1)
  const [restored, inserted] = apply ? ['restaurados', 'añadidos'] : ['por restaurar', 'por añadir']
  const { paragraphs } = closings
  const notFound = Object.entries(paragraphs.notFound)
    .map(([reason, count]) => `${count} ${reason}`)
    .join(', ')
  console.log(
    `Cierres: ${closings.guides} guías leídas y ${closings.changed} ${apply ? 'cambiadas' : 'por cambiar'} ` +
      `(${closings.noClosing} sin frase de cierre en su página, ${closings.noSource} sin página ` +
      `guardada). Párrafos: ${paragraphs.restored} ${restored}, ${paragraphs.inserted} ${inserted}, ` +
      `${paragraphs.present} ya enteros${notFound ? `, sin poder devolver: ${notFound}` : ''}.`,
  )
  const names = Object.entries(fights.unmatched).sort((a, b) => b[1] - a[1])
  for (const [name, count] of names) console.log(`Sin casar: ${name} (${count})`)
  console.log(
    `Combates: ${fights.changed} guías; ${fights.converted} listas ` +
      `${apply ? 'convertidas' : 'por convertir'}, ${fights.unmatchedLists} sin casar ` +
      `(${names.length} nombres) y ${fights.skipped} saltadas por no tener la forma «N x Nombre».`,
  )
  if (apply) {
    console.log(
      `Guardadas: ${closings.published + fights.published} publicadas y ` +
        `${closings.drafts + fights.drafts} borradores.`,
    )
    const images = fights.images
    if (images) {
      console.log(
        `Imágenes de monstruos: ${images.imported} importadas, ${images.reused} recuperadas, ` +
          `${images.linked} enlazadas y ${images.failed} sin imagen.`,
      )
    }
  } else {
    console.log('En seco: sin --apply no se escribe nada.')
  }
  console.log(`Listo en ${seconds} s.`)
  await payload.destroy()
} catch (error) {
  console.error('La puesta al día de las guías falló:', error)
  await payload.destroy()
  // `payload run` sale con 0 cuando el script termina sin lanzar: el fallo se marca aquí.
  process.exit(1)
}
