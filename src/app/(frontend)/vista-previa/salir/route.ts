import { draftMode } from 'next/headers'
import type { NextRequest } from 'next/server'

import { isGuideSlug } from '@/lib/guides/slug'

/** Sale de la vista previa y vuelve a la guía, ya como la ve un visitante. */
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null)
  const slug = form?.get('slug')
  ;(await draftMode()).disable()
  // 303: el navegador vuelve con GET. Solo a una guía del propio sitio.
  return new Response(null, {
    status: 303,
    headers: { Location: typeof slug === 'string' && isGuideSlug(slug) ? `/${slug}` : '/' },
  })
}
