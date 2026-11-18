import { isExternalHref } from '@/lib/site/external'

import { siteShellStrings as s } from './strings'

/**
 * Lo que lleva un enlace a otra web (DESIGN.md, Accessibility): se abre en otra pestaña, sin
 * dar a esa web acceso a esta. Un enlace del sitio se abre en la misma.
 */
export const NEW_TAB = { target: '_blank', rel: 'noopener' } as const

/** El aviso para el lector de pantalla, al final del texto de un enlace a otra web. */
export function NewTabNote() {
  return <span className="sr-only">{s.newTab}</span>
}

/** Un enlace cuyo destino no se sabe de antemano: a otra web, en otra pestaña y avisado. */
export function SiteOrWebLink({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: React.ReactNode
}) {
  if (!isExternalHref(href)) {
    return (
      <a className={className} href={href}>
        {children}
      </a>
    )
  }
  return (
    <a className={className} href={href} {...NEW_TAB}>
      {children}
      <NewTabNote />
    </a>
  )
}
