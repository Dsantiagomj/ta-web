// Los Dofus del menú y de la búsqueda de la cabecera, de la colección de guías de Dofus: lo
// que Torre añade o publica en el panel aparece sin tocar el código.
import type { DofusNavItem } from '@/components/site/nav'
import { mediaImageAsset } from '@/lib/media/image-asset'
import type { Media } from '@/payload-types'

import type { DofusListDoc } from './page'

/** El huevo se pinta a 44px como mucho: basta su archivo de 128px. */
const EGG_SIZE = 128

export function dofusNavItems(list: DofusListDoc[]): DofusNavItem[] {
  return list.map((doc) => {
    const egg = mediaImageAsset(doc.egg && typeof doc.egg === 'object' ? (doc.egg as Media) : null)
    return {
      name: doc.name,
      ...(doc.state === 'published' && { href: `/${doc.slug}` }),
      ...(egg && { image: { src: egg.src, size: EGG_SIZE } }),
    }
  })
}
