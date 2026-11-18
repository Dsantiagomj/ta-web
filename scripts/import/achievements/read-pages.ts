// La prosa de la página de Squarespace de cada página de logro. happy-dom retiene cada
// documento que parsea (unos 8 MB): se suelta después de cada página (squarespace/dom.ts).
import { releaseDom } from '../squarespace/dom'
import { parsePage } from '../squarespace/parse-page'
import { achievementProse, type AchievementProse } from './prose'

/** Una página de logro de este sitio: su slug y si tiene logro de DofusDB. */
export interface AchievementPageRef {
  slug: string
  dofusDb: boolean
}

/**
 * Lee cada slug con pageHtml (null si no hay página) y devuelve su prosa. La prosa ya es
 * texto, así que el documento se suelta en cuanto se ha leído. Una página sin logro de DofusDB
 * se queda con las listas de su resumen (achievementProse).
 */
export async function readAchievementPages(
  refs: AchievementPageRef[],
  pageHtml: (slug: string) => Promise<string | null>,
  release: () => Promise<void> = releaseDom,
): Promise<Map<string, AchievementProse>> {
  const pages = new Map<string, AchievementProse>()
  for (const { slug, dofusDb } of refs) {
    const html = await pageHtml(slug)
    if (!html) continue
    pages.set(slug, achievementProse(parsePage(html), { dofusDb }))
    await release()
  }
  return pages
}
