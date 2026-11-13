import { describe, expect, it } from 'vitest'

import legacyUrls from '@/lib/redirects/legacy-urls.json'
import {
  LEGACY_URLS,
  buildLegacyTable,
  legacyKey,
  lookupLegacyUrl,
  type LegacySections,
} from '@/lib/redirects/table'
import { RESERVED_SLUGS } from '@/lib/guides/slug'

// La tabla de URL antiguas de Squarespace (backlog B-03 a B-06 y B-08): un 301 a la página
// que la sustituye o un 410. Un solo archivo de datos, por secciones.

const sections = legacyUrls as LegacySections

describe('buildLegacyTable', () => {
  it('junta los 301 y los 410 de todas las secciones', () => {
    const table = buildLegacyTable({
      a: { description: 'A', moved: { '/viejo': '/nuevo' }, gone: ['/borrado'] },
      b: { description: 'B', moved: { '/otro': '/metalogros#astrub' } },
    })

    expect(table.get('/viejo')).toEqual({ status: 301, to: '/nuevo' })
    expect(table.get('/otro')).toEqual({ status: 301, to: '/metalogros#astrub' })
    expect(table.get('/borrado')).toEqual({ status: 410 })
    expect(table.size).toBe(3)
  })

  it('rechaza una URL repetida, aunque esté en otra sección', () => {
    expect(() =>
      buildLegacyTable({
        a: { description: 'A', gone: ['/repetida'] },
        b: { description: 'B', moved: { '/repetida': '/' } },
      }),
    ).toThrow(/\/repetida/)
  })

  it('rechaza una cadena: un destino que es a su vez una URL de la tabla', () => {
    expect(() =>
      buildLegacyTable({
        a: { description: 'A', moved: { '/uno': '/dos', '/dos': '/' } },
      }),
    ).toThrow(/cadena/)
    expect(() =>
      buildLegacyTable({
        a: { description: 'A', moved: { '/uno': '/dos#ancla' }, gone: ['/dos'] },
      }),
    ).toThrow(/cadena/)
  })

  it('rechaza URL que no son un slug plano en minúsculas', () => {
    for (const bad of ['sin-barra', '/Mayusculas', '/con/subruta', '/', '/acento-á']) {
      expect(() => buildLegacyTable({ a: { description: 'A', gone: [bad] } })).toThrow()
    }
  })

  it('rechaza las rutas propias del sitio: nunca tapa el panel, la API ni los índices', () => {
    for (const slug of RESERVED_SLUGS) {
      expect(() => buildLegacyTable({ a: { description: 'A', gone: [`/${slug}`] } })).toThrow()
    }
  })

  it('rechaza destinos fuera del sitio', () => {
    expect(() =>
      buildLegacyTable({ a: { description: 'A', moved: { '/x': 'https://otro.com/' } } }),
    ).toThrow()
    expect(() =>
      buildLegacyTable({ a: { description: 'A', moved: { '/x': '//otro.com' } } }),
    ).toThrow()
  })
})

describe('legacyKey', () => {
  it('normaliza la ruta: minúsculas y sin barra final', () => {
    expect(legacyKey('/Home')).toBe('/home')
    expect(legacyKey('/home/')).toBe('/home')
    expect(legacyKey('/metalogro-astrub')).toBe('/metalogro-astrub')
  })

  it('deja fuera las rutas con subruta: la tabla solo tiene URL de primer nivel', () => {
    expect(legacyKey('/')).toBeNull()
    expect(legacyKey('/api/health')).toBeNull()
    expect(legacyKey('/_next/static/chunk.js')).toBeNull()
  })
})

describe('lookupLegacyUrl', () => {
  it('da el 301 o el 410 de una URL antigua', () => {
    expect(lookupLegacyUrl('/home')).toEqual({ status: 301, to: '/' })
    expect(lookupLegacyUrl('/logros')).toEqual({ status: 301, to: '/metalogros' })
    expect(lookupLegacyUrl('/metalogro-astrub')).toEqual({
      status: 301,
      to: '/metalogros#astrub',
    })
    expect(lookupLegacyUrl('/cart')).toEqual({ status: 410 })
    expect(lookupLegacyUrl('/WIP/')).toEqual({ status: 410 })
  })

  it('no toca lo que no está en la tabla', () => {
    expect(lookupLegacyUrl('/aprendizaje-escudero')).toBeNull()
    expect(lookupLegacyUrl('/')).toBeNull()
    expect(lookupLegacyUrl('/admin')).toBeNull()
  })
})

describe('la tabla de legacy-urls.json', () => {
  it('se construye sin errores: sin repetidas, sin cadenas, sin rutas propias', () => {
    expect(LEGACY_URLS.size).toBeGreaterThan(0)
  })

  it('cada sección dice de dónde salen sus URL', () => {
    for (const [name, section] of Object.entries(sections)) {
      expect(section.description, name).toMatch(/\S/)
    }
  })

  it('B-06: los hubs viejos van a la portada y /logros a /metalogros', () => {
    for (const from of ['/home', '/index', '/inicio-20']) {
      expect(lookupLegacyUrl(from)).toEqual({ status: 301, to: '/' })
    }
    expect(lookupLegacyUrl('/logros')).toEqual({ status: 301, to: '/metalogros' })
  })

  it('B-06: las páginas de prueba, las de datos de los embeds y /cart dan 410', () => {
    for (const from of [
      '/wip',
      '/hielos-test',
      '/pruebas',
      '/checklist-silvestre-datos',
      '/checklist-hielos-datos',
      '/checklist-nebuloso-datos',
      '/cart',
    ]) {
      expect(lookupLegacyUrl(from), from).toEqual({ status: 410 })
    }
  })

  it('B-05: los 33 metalogros van a su ancla de /metalogros, la del slug sin «metalogro-»', () => {
    const moved = Object.entries(sections.metalogros.moved ?? {})
    const pages = moved.filter(([from]) => from !== '/metalogro-alineamiento-misiones')
    expect(pages).toHaveLength(33)
    for (const [from, to] of pages) {
      expect(to).toBe(`/metalogros#${from.replace(/^\/metalogro-/, '')}`)
    }
    expect(lookupLegacyUrl('/metalogro-alineamiento-misiones')).toEqual({
      status: 301,
      to: '/metalogros#alineamiento',
    })
  })

  it('B-04: los esbozos vacíos van a su página de logro o dan 410', () => {
    const stubs = sections.stubs
    const count = Object.keys(stubs.moved ?? {}).length + (stubs.gone ?? []).length
    // 166 esbozos en el rastreo: 9 son guías de Dofus En preparación, /cart va con los hubs
    // y /metalogro-alineamiento-misiones con los metalogros.
    expect(count).toBe(155)
  })

  it('no redirige lo que sigue vivo en Squarespace y se porta después', () => {
    for (const pending of [
      '/clases-1',
      '/feca-1',
      '/mazmorra-crunchidor',
      '/aviso-legal',
      '/mascotas',
      '/subscribe',
      '/metalogro-krosmoz',
      '/checklist-silvestre',
    ]) {
      expect(lookupLegacyUrl(pending), pending).toBeNull()
    }
  })
})
