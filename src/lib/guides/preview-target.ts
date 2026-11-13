import type { Payload } from 'payload'

import { readAchievementPage } from '@/lib/achievements/queries'
import { readChecklist } from '@/lib/checklists/queries'
import { readDofusGuide } from '@/lib/dofus-guides/queries'
import type { User } from '@/payload-types'

import { findGuideBySlug } from './queries'

/**
 * El slug de la página a la que lleva /vista-previa para un usuario del panel: una guía, una
 * página de logro, una guía de Dofus o una checklist, que comparten /<slug> sin chocar.
 * Borradores incluidos. Null si no hay ninguna.
 */
export async function findPreviewSlug(
  payload: Payload,
  slug: string,
  user: User,
): Promise<string | null> {
  const preview = { preview: { user } }
  const found =
    (await findGuideBySlug(payload, slug, preview)) ??
    (await readAchievementPage(payload, slug, preview))?.page ??
    (await readDofusGuide(payload, slug, preview))?.guide ??
    (await readChecklist(payload, slug, preview))?.checklist
  return found?.slug ?? null
}
