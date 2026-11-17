import { draftMode } from 'next/headers'
import type { NextRequest } from 'next/server'

import { isGuideSlug } from '@/lib/guides/slug'

/**
 * Sale de la vista previa y vuelve a la página, ya como la ve un visitante. El aviso va en el
 * layout, que no sabe de qué página es: el slug llega en el formulario o sale de la página
 * desde la que se pulsó (Referer).
 */
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null)
  const slug = form?.get('slug') ?? refererSlug(request.headers.get('referer'))
  ;(await draftMode()).disable()
  // 303: el navegador vuelve con GET. Solo a una guía del propio sitio.
  return new Response(null, {
    status: 303,
    headers: { Location: typeof slug === 'string' && isGuideSlug(slug) ? `/${slug}` : '/' },
  })
}

/** El slug de la página de la que viene el formulario, o undefined. */
function refererSlug(referer: string | null): string | undefined {
  if (!referer) return undefined
  try {
    return decodeURIComponent(new URL(referer).pathname.replace(/^\//, ''))
  } catch {
    return undefined
  }
}
