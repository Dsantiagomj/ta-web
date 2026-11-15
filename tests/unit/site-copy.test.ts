import { describe, expect, it } from 'vitest'

import { indexTextDefaults, siteSettingsDefaults } from '@/lib/site-copy/defaults'
import { validateLinkUrl } from '@/lib/site-copy/link'
import {
  copyFills,
  resolveIndexTexts,
  resolveSiteSettings,
  withDefaults,
} from '@/lib/site-copy/resolve'

// Los textos del sitio que Torre edita en el panel (Ajustes del sitio, Portada e índices):
// lo que no escribió, o dejó vacío, es el texto de siempre.
describe('withDefaults', () => {
  const defaults = { title: 'Título', group: { lead: 'Entradilla', cta: 'Ver' } }

  it('sin nada guardado, el texto de siempre', () => {
    expect(withDefaults(defaults, null)).toEqual(defaults)
    expect(withDefaults(defaults, {})).toEqual(defaults)
  })

  it('lo que escribió Torre gana, campo a campo', () => {
    expect(withDefaults(defaults, { group: { lead: 'Otra entradilla' } })).toEqual({
      title: 'Título',
      group: { lead: 'Otra entradilla', cta: 'Ver' },
    })
  })

  it('un campo vacío o en blanco vuelve al texto de siempre', () => {
    expect(withDefaults(defaults, { title: '   ', group: { lead: '', cta: null } })).toEqual(
      defaults,
    )
  })

  it('ignora lo que no es texto y lo que no está en los textos de siempre', () => {
    expect(withDefaults(defaults, { title: 3, extra: 'x', group: 'nada' })).toEqual(defaults)
  })
})

describe('Ajustes del sitio', () => {
  it('sin guardar, los de hoy: el nombre, la descripción, el pie y las redes', () => {
    const settings = resolveSiteSettings(null)
    expect(settings.name).toBe('Torrente Arcano')
    expect(settings.description).toBe('Guías de misiones, logros, clases y checklists de Dofus.')
    expect(settings.footer.bio).toBe(
      'Juega a Dofus en directo y escribe todas las guías de esta web.',
    )
    expect(settings.socials.twitch).toEqual({
      url: 'https://www.twitch.tv/torrentearcano',
      handle: 'torrentearcano',
    })
    expect(settings.socials.kofi.url).toBe('https://ko-fi.com/torrentearcano')
    expect(settings.ogImage).toBeNull()
  })

  it('un enlace que no es una dirección web vuelve al de siempre', () => {
    const settings = resolveSiteSettings({
      socials: {
        twitch: { url: 'javascript:alert(1)' },
        kick: { url: 'https://kick.com/otro', handle: 'otro' },
      },
    })
    expect(settings.socials.twitch.url).toBe(siteSettingsDefaults.socials.twitch.url)
    expect(settings.socials.kick).toEqual({ url: 'https://kick.com/otro', handle: 'otro' })
  })

  it('la imagen al compartir es el archivo original subido, con su tamaño y su texto', () => {
    const settings = resolveSiteSettings({
      ogImage: { url: '/api/media/file/portada.png', width: 1200, height: 630, alt: 'Torre' },
    })
    expect(settings.ogImage).toEqual({
      url: '/api/media/file/portada.png',
      width: 1200,
      height: 630,
      alt: 'Torre',
    })
    // Sin poblar (solo el id) o sin archivo, no hay imagen.
    expect(resolveSiteSettings({ ogImage: 7 }).ogImage).toBeNull()
    expect(resolveSiteSettings({ ogImage: { url: null } }).ogImage).toBeNull()
  })
})

describe('Portada e índices', () => {
  it('sin guardar, los textos de hoy', () => {
    const texts = resolveIndexTexts(undefined)
    expect(texts.home.title).toBe('Torrente Arcano')
    expect(texts.home.lead).toBe(
      'Misiones, logros y Dofus explicados paso a paso, con capturas y coordenadas para copiar en el chat.',
    )
    expect(texts.home.tour.step1.title).toBe('Lo que hace falta, arriba del todo')
    expect(texts.metalogros.title).toBe('Todos los metalogros')
    expect(texts.metalogros.seo.title).toBe('Todos los metalogros de Dofus')
    expect(texts.dofusGuides.eyebrow).toBe('Misiones y logros de cada Dofus')
    expect(texts.checklists.empty).toBe(
      'Todavía no hay checklists publicadas. Vuelve pronto: Torre está preparando la primera.',
    )
  })

  it('lo que escribió Torre gana', () => {
    const texts = resolveIndexTexts({ metalogros: { lead: 'Otra entradilla' } })
    expect(texts.metalogros.lead).toBe('Otra entradilla')
    expect(texts.metalogros.title).toBe(indexTextDefaults.metalogros.title)
  })
})

describe('copyFills', () => {
  it('lista los campos vacíos con su texto de siempre, por su camino', () => {
    const fills = copyFills(
      { title: 'Título', group: { lead: 'Entradilla' } },
      { title: 'De Torre', group: { lead: ' ' } },
    )
    expect(fills).toEqual([{ path: 'group.lead', value: 'Entradilla' }])
  })

  it('con todo escrito, nada', () => {
    expect(copyFills({ title: 'Título' }, { title: 'De Torre' })).toEqual([])
  })
})

describe('validateLinkUrl', () => {
  it('vacío vale: sale el enlace de siempre', () => {
    expect(validateLinkUrl('')).toBe(true)
    expect(validateLinkUrl(null)).toBe(true)
  })

  it('pide una dirección web completa', () => {
    expect(validateLinkUrl('https://kick.com/torretv')).toBe(true)
    expect(validateLinkUrl('kick.com/torretv')).toMatch(/https:\/\//)
    expect(validateLinkUrl('javascript:alert(1)')).toMatch(/https:\/\//)
  })
})
