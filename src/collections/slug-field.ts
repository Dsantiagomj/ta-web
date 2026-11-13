import { type AddressKind, panelStrings } from '../lib/admin/strings'

/**
 * El panel del campo slug, que Torre ve como «Dirección en la web»: en la barra lateral, con
 * su ayuda y la dirección completa debajo (src/components/admin/SlugDescription.tsx).
 */
export function slugAdmin(help: string, address: AddressKind = 'page') {
  return {
    position: 'sidebar' as const,
    components: {
      Description: {
        path: '/components/admin/SlugDescription#SlugDescription',
        clientProps: address === 'page' ? { help } : { help, address },
      },
    },
  }
}

export const SLUG_LABEL = panelStrings.slug.label
