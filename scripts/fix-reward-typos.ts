// Corrige las erratas de nombre de objeto de «Recompensas en texto» de las guías: una línea
// de objeto que no casa con la misión y se parece mucho a uno de sus objetos de recompensa,
// con la misma cantidad, pasa a su nombre de DofusDB, y su fila se enlaza en los objetos de
// la guía. Solo cambia ese nombre; lo demás queda como lo escribió Torre. Lo que no es una
// errata clara (libros, notas, objetos que la misión no da) se lista con el motivo
// (src/lib/guides/reward-typos.ts).
// Uso: pnpm guides:reward-typos [--apply] [--remote] [--production]
// Sin --apply solo lista lo que haría (en seco), cada cambio como «slug: antes → después».
// Repetirla no cambia nada. Una guía cuya última versión está publicada se guarda publicada;
// si es un borrador, como borrador. Contra dev, en seco:
// railway run --service web --environment dev pnpm guides:reward-typos --remote
import { getPayload } from 'payload'

import config from '@payload-config'
import { databaseScriptRefusal } from '@/lib/db/script-guard'
import { fixRewardTypos, rewardTyposReport } from '@/lib/guides/reward-typos'

import { runPayloadScript } from './payload-script'

const args = process.argv.slice(2)
// Antes de arrancar Payload: un entorno equivocado no llega a conectarse.
const refusal = databaseScriptRefusal(process.env, args, 'corregir las recompensas de sus guías')
if (refusal) {
  console.error(refusal)
  process.exit(1)
}
const apply = args.includes('--apply')

await runPayloadScript(
  () => getPayload({ config }),
  async (payload) => {
    const result = await fixRewardTypos(payload, { apply })
    for (const line of rewardTyposReport(result, apply)) console.log(line)
  },
  { label: 'La corrección de erratas de las recompensas' },
)
