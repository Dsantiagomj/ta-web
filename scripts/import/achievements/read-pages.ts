// La prosa de la página de Squarespace de cada página de logro. happy-dom retiene cada
// documento que parsea (unos 8 MB): se suelta después de cada página (squarespace/dom.ts).
import { releaseDom } from '../squarespace/dom'
import { parsePage } from '../squarespace/parse-page'
import { achievementProse, type AchievementProse } from './prose'

/**
 * Lee cada slug con pageHtml (null si no hay página) y devuelve su prosa. La prosa ya es
 * texto, así que el documento se suelta en cuanto se ha leído.
 */
export async function readAchievementPages(
  slugs: string[],
  pageHtml: (slug: string) => Promise<string | null>,
  release: () => Promise<void> = releaseDom,
): Promise<Map<string, AchievementProse>> {
  const pages = new Map<string, AchievementProse>()
  for (const slug of slugs) {
    const html = await pageHtml(slug)
    if (!html) continue
    pages.set(slug, achievementProse(parsePage(html)))
    await release()
  }
  return pages
}
