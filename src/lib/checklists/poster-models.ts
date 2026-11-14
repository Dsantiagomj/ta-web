// Lo que el índice /checklists manda al navegador para el porcentaje de cada cartel: de cada
// checklist Publicada, lo justo de lo que recibe la isla de su página (poster-progress.ts). Lee
// como un visitante, con la misma lectura que la página (readChecklist).
import type { Payload } from 'payload'

import { islandData } from './page'
import { soulsPosterModel, stepsPosterModel, type PosterProgressModel } from './poster-progress'
import { readChecklist } from './queries'
import { soulsView } from './souls'

/** Los modelos de esas checklists, en su orden; una que ya no está se queda fuera. */
export async function readPosterModels(
  payload: Payload,
  slugs: readonly string[],
): Promise<PosterProgressModel[]> {
  const models = await Promise.all(
    slugs.map(async (slug): Promise<PosterProgressModel | null> => {
      const data = await readChecklist(payload, slug)
      if (!data) return null
      if (data.checklist.kind === 'souls') {
        const view = soulsView({
          checklist: data.checklist,
          stages: data.souls?.stages ?? [],
          monsters: data.souls?.monsters ?? {},
          subareas: data.souls?.subareas ?? {},
          dungeons: data.souls?.dungeons ?? [],
          siteUrl: '',
        })
        return soulsPosterModel(view.island)
      }
      return stepsPosterModel(islandData({ ...data, siteUrl: '' }))
    }),
  )
  return models.filter((model) => model !== null)
}
