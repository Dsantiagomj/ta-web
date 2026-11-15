// Pasa a las de DofusDB las cifras de recompensa de las guías que casi coinciden con ellas
// (a un 10 % o menos, DOFUSDB_TOLERANCE): XP, kamas y cantidades de objetos, sueltas y de
// cada tramo de «Por nivel». Las que se apartan más se quedan y se listan con su ratio.
// «Recompensas en texto» no se toca (src/lib/guides/prefer-dofusdb.ts).
// Uso: pnpm guides:rewards-dofusdb [--apply] [--remote] [--production]
// Sin --apply solo lista lo que haría (en seco). Va después de pnpm guides:rewards, que llena
// «Por nivel». Repetirla no cambia nada. Una guía cuya última versión está publicada se
// guarda publicada; si es un borrador, como borrador. Contra dev, en seco:
// railway run --service web --environment dev pnpm guides:rewards-dofusdb --remote
import { getPayload } from 'payload'

import config from '@payload-config'
import { databaseScriptRefusal } from '@/lib/db/script-guard'
import { preferDofusDbReport, preferDofusDbRewards } from '@/lib/guides/prefer-dofusdb'

import { runPayloadScript } from './payload-script'

const args = process.argv.slice(2)
// Antes de arrancar Payload: un entorno equivocado no llega a conectarse.
const refusal = databaseScriptRefusal(process.env, args, 'cambiar las recompensas de sus guías')
if (refusal) {
  console.error(refusal)
  process.exit(1)
}
const apply = args.includes('--apply')

await runPayloadScript(
  () => getPayload({ config }),
  async (payload) => {
    const result = await preferDofusDbRewards(payload, { apply })
    for (const line of preferDofusDbReport(result, apply)) console.log(line)
  },
  { label: 'El paso de las recompensas a DofusDB' },
)
