import type { ImageAsset } from '@/components/ui/types'

/** Un objeto del juego tal como lo pintan las páginas: nombre y, si ya se importó, su icono. */
export interface GameItem {
  name: string
  icon?: ImageAsset
}

export interface Monster extends GameItem {
  level?: number
}

export interface Quantity<T> {
  item: T
  quantity: number
}

export interface Achievement {
  name: string
  href: string
  icon?: ImageAsset
}
