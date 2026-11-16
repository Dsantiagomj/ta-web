import type { Payload } from 'payload'

import { type IndexTexts } from './defaults'
import { resolveNavigation, type SiteNavigation } from './navigation'
import { resolveIndexTexts, resolveSiteSettings, type SiteSettings } from './resolve'

// Los globales de Ajustes, leídos como un visitante: lo que sale en la web.

/** «Ajustes del sitio», con la imagen al compartir poblada. */
export async function readSiteSettings(payload: Payload): Promise<SiteSettings> {
  return resolveSiteSettings(
    await payload.findGlobal({ slug: 'site-settings', depth: 1, overrideAccess: false }),
  )
}

/** «Portada e índices». */
export async function readIndexTexts(payload: Payload): Promise<IndexTexts> {
  return resolveIndexTexts(
    await payload.findGlobal({ slug: 'index-texts', depth: 0, overrideAccess: false }),
  )
}

/**
 * «Navegación», con los Dofus destacados poblados como los ve un visitante: solo los
 * publicados, con su huevo (el de Torre o el del objeto, con su corrección).
 */
export async function readNavigation(payload: Payload): Promise<SiteNavigation> {
  return resolveNavigation(
    await payload.findGlobal({
      slug: 'navigation',
      depth: 3,
      populate: {
        'dofus-guides': { name: true, egg: true, dofus: true },
        items: { image: true, correction: true },
      },
      draft: false,
      overrideAccess: false,
    }),
  )
}
