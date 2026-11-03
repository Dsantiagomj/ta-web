import { describe, expect, it } from 'vitest'

import {
  eggSrcSet,
  modeEggs,
  modeSwitchTitle,
  modeToggleStrings,
} from '@/components/mode-toggle/strings'

describe('textos del interruptor de modo', () => {
  it('tiene un nombre accesible fijo en español', () => {
    expect(modeToggleStrings.label).toBe('Modo claro')
  })

  it('cada modo tiene su huevo: Marfil el claro y Ébano el oscuro', () => {
    expect(modeEggs.light).toEqual({ name: 'Dofus Marfil', file: '/img/mode/dofus-marfil' })
    expect(modeEggs.dark).toEqual({ name: 'Dofus Ébano', file: '/img/mode/dofus-ebano' })
  })

  it('da los srcset AVIF y WebP a 1x y 2x del tamaño en pantalla', () => {
    expect(eggSrcSet(modeEggs.dark, 'avif')).toBe(
      '/img/mode/dofus-ebano-28.avif 1x, /img/mode/dofus-ebano-56.avif 2x',
    )
    expect(eggSrcSet(modeEggs.light, 'webp')).toBe(
      '/img/mode/dofus-marfil-28.webp 1x, /img/mode/dofus-marfil-56.webp 2x',
    )
  })

  it('el título dice el modo actual, su huevo y qué hace el clic', () => {
    expect(modeSwitchTitle('dark')).toBe('Modo oscuro · Dofus Ébano. Pulsa para cambiar')
    expect(modeSwitchTitle('light')).toBe('Modo claro · Dofus Marfil. Pulsa para cambiar')
  })
})
