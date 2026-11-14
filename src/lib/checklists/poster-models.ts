// Lo que pide el porcentaje de cada cartel del índice /checklists: de cada checklist Publicada,
// lo justo de lo que recibe la isla de su página (poster-progress.ts). Lee como un visitante,
// con la lectura en caché de la página (readPublishedChecklist), así que no repite el trabajo.
import { islandData } from './page'
import { soulsPosterModel, stepsPosterModel, type PosterProgressModel } from './poster-progress'
import { readPublishedChecklist } from './published'
import { soulsView } from './souls'

/** Los modelos de esas checklists, en su orden; una que ya no está se queda fuera. */
export async function readPosterModels(slugs: readonly string[]): Promise<PosterProgressModel[]> {
  const models = await Promise.all(
    slugs.map(async (slug): Promise<PosterProgressModel | null> => {
      const data = await readPublishedChecklist(slug)
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
