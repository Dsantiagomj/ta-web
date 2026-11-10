import config from '@payload-config'
import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'
import { getPayload } from 'payload'

import { readAchievementPage } from '@/lib/achievements/queries'
import { readDofusGuide } from '@/lib/dofus-guides/queries'
import { findGuideBySlug } from '@/lib/guides/queries'
import { isGuideSlug } from '@/lib/guides/slug'
import { guideStrings } from '@/lib/guides/strings'
import type { User } from '@/payload-types'

const s = guideStrings.page.preview

function text(message: string, status: number) {
  return new Response(message, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

/**
 * Entrada de la vista previa desde el panel (src/lib/guides/preview.ts). La protege la
 * sesión de Payload, no un secreto en la URL: sin usuario del panel no se activa el draft
 * mode. Solo lleva a la guía, al logro o a la guía de Dofus del slug, nunca a otra dirección.
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')
  if (!isGuideSlug(slug)) return text(s.badSlug, 400)

  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  if (!user) return text(s.signIn, 401)

  // Una guía, una página de logro o una guía de Dofus: comparten /<slug> sin chocar.
  const preview = { preview: { user: user as User } }
  const found =
    (await findGuideBySlug(payload, slug, preview)) ??
    (await readAchievementPage(payload, slug, preview))?.page ??
    (await readDofusGuide(payload, slug, preview))?.guide
  if (!found) return text(s.notFound, 404)

  ;(await draftMode()).enable()
  redirect(`/${found.slug}`)
}
