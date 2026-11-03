import { describe, expect, it } from 'vitest'

import { modeEggs, modeSwitchTitle, modeToggleStrings } from '@/components/mode-toggle/strings'

describe('textos del interruptor de modo', () => {
  it('tiene un nombre accesible fijo en español', () => {
    expect(modeToggleStrings.label).toBe('Modo claro')
  })

  it('cada modo tiene su huevo: Marfil el claro y Ébano el oscuro', () => {
    expect(modeEggs.light).toEqual({ name: 'Dofus Marfil', src: '/img/mode/dofus-marfil.png' })
    expect(modeEggs.dark).toEqual({ name: 'Dofus Ébano', src: '/img/mode/dofus-ebano.png' })
  })

  it('el título dice el modo actual, su huevo y qué hace el clic', () => {
    expect(modeSwitchTitle('dark')).toBe('Modo oscuro · Dofus Ébano. Pulsa para cambiar')
    expect(modeSwitchTitle('light')).toBe('Modo claro · Dofus Marfil. Pulsa para cambiar')
  })
})
