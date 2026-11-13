import config from '@payload-config'
import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'
import { getPayload } from 'payload'

import { findPreviewSlug } from '@/lib/guides/preview-target'
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
 * mode. Solo lleva a la guía, al logro, a la guía de Dofus o a la checklist del slug, nunca a
 * otra dirección.
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')
  if (!isGuideSlug(slug)) return text(s.badSlug, 400)

  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  if (!user) return text(s.signIn, 401)

  const found = await findPreviewSlug(payload, slug, user as User)
  if (!found) return text(s.notFound, 404)

  ;(await draftMode()).enable()
  redirect(`/${found}`)
}
