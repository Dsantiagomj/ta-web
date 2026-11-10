import { siteShellStrings as s } from '@/components/site/strings'
import { cx } from '@/components/ui/cx'

import { Emblem } from './Emblem'
import './lockup.css'

/**
 * El logo «Sello» (DESIGN.md, Brand): el emblema y el nombre en dos líneas, «Torrente» en
 * tinta y «Arcano» en el acento del tema. Al pasar el ratón el sombrero se inclina y los
 * ojos parpadean; con movimiento reducido no se mueve. El enlace se llama «Torrente Arcano».
 * Es un enlace normal, como el resto del sitio: la portada llega con la transición entre
 * páginas (DESIGN.md, Motion), que la navegación del cliente de Next no tiene.
 */
export function Lockup({
  size = 'header',
  className,
}: {
  size?: 'header' | 'footer'
  className?: string
}) {
  return (
    // eslint-disable-next-line @next/next/no-html-link-for-pages -- carga entera a propósito (DESIGN.md, Motion)
    <a href="/" className={cx('lockup', `lockup--${size}`, className)}>
      <Emblem size={size === 'footer' ? 32 : 36} className="lockup__emblem" />
      <span className="lockup__word">
        <span className="lockup__top">{s.brandTop}</span>{' '}
        <span className="lockup__acc">{s.brandAccent}</span>
      </span>
    </a>
  )
}
