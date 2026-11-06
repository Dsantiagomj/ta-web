import { Picture } from '@/components/ui/Picture'
import type { ImageAsset } from '@/components/ui/types'

import { GAME_ICONS, type GameIconName } from './game-icons'

// En el hueco de 44px los iconos se pintan a 32px; uno cuyo archivo es más pequeño (la
// flecha de XP, 24px) se queda en su tamaño en vez de ampliarse borroso.
const ICON_PX = 32

/**
 * El hueco de un icono del juego, como una casilla del inventario (DESIGN.md, Icon wells):
 * oscuro también en modo claro, para que el icono a todo color se lea. Sin icono, el hueco
 * queda vacío; nunca un sustituto.
 */
export function IconWell({ icon, image }: { icon?: GameIconName; image?: ImageAsset }) {
  const file = icon && GAME_ICONS[icon]
  const px = file ? Math.min(ICON_PX, file.size) : ICON_PX
  return (
    <span className="well" aria-hidden="true">
      {file && (
        // eslint-disable-next-line @next/next/no-img-element -- archivo estático ya en WebP
        <img src={file.src} width={px} height={px} alt="" decoding="async" />
      )}
      {!file && image && <Picture image={image} alt="" className="size-8" />}
    </span>
  )
}
