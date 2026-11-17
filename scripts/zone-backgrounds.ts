// Trae de DofusDB el fondo de cada subzona que usan las guías de misión y las páginas de
// logro publicadas y aún no lo tiene (src/lib/zones/backfill.ts): el render de un mapa de la
// subzona, sin la marca de DofusDB, en Media, como el botón «Traer fondo de DofusDB» del
// panel. Una página con fondo propio no cuenta. Solo rellena lo vacío, así que repetirlo no
// cambia nada. Va después de la migración zone_backgrounds y de un `pnpm data:refresh`, que
// guarda la subzona de los mapas de inicio de cada misión.
// Uso: pnpm zones:backgrounds [--apply] [--remote] [--production]
// Sin --apply solo lista lo que haría (en seco). Escribe en la base de DATABASE_URL (vacía:
// la de pnpm db:dev); contra una base remota pide --remote, y en producción --production.
// Contra dev, en seco:
// railway run -s web -e dev -- pnpm exec payload run scripts/zone-backgrounds.ts -- --remote
import { getPayload } from 'payload'

import config from '@payload-config'
import { databaseScriptRefusal } from '@/lib/db/script-guard'
import { fillMissingZoneBackgrounds, zoneBackgroundReport } from '@/lib/zones/backfill'

import { runPayloadScript } from './payload-script'

const args = process.argv.slice(2)
// Antes de arrancar Payload: un entorno equivocado no llega a conectarse.
const refusal = databaseScriptRefusal(process.env, args, 'traer los fondos de zona')
if (refusal) {
  console.error(refusal)
  process.exit(1)
}
const apply = args.includes('--apply')

await runPayloadScript(
  () => getPayload({ config }),
  async (payload) => {
    const result = await fillMissingZoneBackgrounds(payload, {
      apply,
      log: (message) => console.log(message),
    })
    for (const line of zoneBackgroundReport(result, apply)) console.log(line)
    if (result.failed.length > 0) throw new Error('Algunas subzonas se quedaron sin fondo.')
  },
  { label: 'La carga de los fondos de zona' },
)
