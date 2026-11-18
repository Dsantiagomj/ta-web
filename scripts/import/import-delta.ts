// La importación delta: lo que Torre escribió en Squarespace desde el inventario anterior, sin
// deshacer lo que cambió en el panel (delta/load-delta.ts). Va después de pnpm import:inventory,
// que baja el inventario nuevo, y del despliegue de la tabla de redirecciones sin las filas de
// los esbozos que Torre llenó (scripts/redirects/stubs.ts, FILLED_STUBS).
// Uso: pnpm import:delta --from <inventario nuevo> --previous <inventario anterior>
//        [--apply] [--remote] [--production]
// Sin --apply solo informa, página a página: las guías nuevas, con su misión y las imágenes que
// subiría, y lo que no trata; no escribe ni sube nada. Escribe
// en la base de DATABASE_URL (vacía: la de pnpm db:dev); contra una base remota pide --remote, y
// en producción --production. Contra dev, en seco:
// railway run -s web -e dev -- pnpm import:delta --from <nuevo> --previous <anterior> --remote
import { getPayload } from 'payload'

import config from '@payload-config'
import { databaseScriptRefusal } from '@/lib/db/script-guard'

import { deltaReport, loadDelta } from './delta/load-delta'
import { compareInventories } from './inventory/read'
import { runPayloadScript } from '../payload-script'
import { createImageFetcher } from './squarespace/fetch-image'

const USAGE =
  'Uso: pnpm import:delta --from <inventario nuevo> --previous <inventario anterior> ' +
  '[--apply] [--remote] [--production]'

const args = process.argv.slice(2)
const option = (name: string) => {
  const index = args.indexOf(name)
  const value = index === -1 ? undefined : args[index + 1]
  return value && !value.startsWith('--') ? value : null
}
const next = option('--from')
const previous = option('--previous')
if (!next || !previous) {
  console.error(USAGE)
  process.exit(1)
}
// Antes de arrancar Payload: un entorno equivocado no llega a conectarse.
const refusal = databaseScriptRefusal(process.env, args, 'importar lo nuevo de Squarespace')
if (refusal) {
  console.error(refusal)
  process.exit(1)
}
const apply = args.includes('--apply')

await runPayloadScript(
  () => getPayload({ config }),
  async (payload) => {
    const deltas = await compareInventories(previous, next)
    const report = await loadDelta(payload, {
      previous,
      next,
      deltas,
      apply,
      fetchImage: createImageFetcher(),
      log: (message) => console.log(message),
    })
    console.log('')
    for (const line of deltaReport(report, apply)) console.log(line)
  },
  { label: 'La importación delta' },
)
