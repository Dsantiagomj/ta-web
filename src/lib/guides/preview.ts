// Vista previa de borradores desde el panel (DESIGN.md, Quest guide; AGENTS.md, Payload
// rules). El panel abre /vista-previa?slug=…, que exige la sesión de Payload, activa el
// draft mode de Next y lleva a la guía. Sin sesión, la guía sigue enseñando lo publicado.

import { isGuideSlug } from './slug'

export const PREVIEW_PATH = '/vista-previa'
export const EXIT_PREVIEW_PATH = '/vista-previa/salir'

/** La URL de la vista previa de una guía, o null si aún no tiene un slug de guía. */
export function guidePreviewUrl(slug: unknown, origin: string): string | null {
  if (typeof slug !== 'string' || !isGuideSlug(slug)) return null
  return `${origin}${PREVIEW_PATH}?slug=${slug}`
}

/**
 * El origen del sitio para el iframe de la vista previa en vivo. Tiene que ser absoluto:
 * el panel le manda los mensajes con postMessage a ese origen. Detrás del proxy de Railway
 * la petición no conoce el dominio público, así que manda NEXT_PUBLIC_SITE_URL.
 */
export function previewOrigin(env: Record<string, string | undefined>, requestOrigin: string) {
  return env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '') || requestOrigin
}
