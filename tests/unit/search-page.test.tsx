// @vitest-environment happy-dom
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { heroResults, siteEntries } from '@/components/site/search'
import { SearchPage } from '@/components/site/SearchPage'
import { searchPageQuery, searchPageView } from '@/components/site/search-page'
import type { SearchIndex } from '@/lib/search/guide-index'

// /buscar: la búsqueda de la portada sin JavaScript. El mismo índice, el mismo orden y los
// mismos grupos que la isla de la portada, pintados en el servidor.

const index: SearchIndex = {
  guides: [
    ['El ocre perdido', 'el-ocre-perdido', 'Logro del ocre', 60],
    ['Seis pies bajo tierra', 'seis-pies-bajo-tierra', null, 20],
  ],
  achievements: [['Almas del ocre', 'almas-del-ocre', 'Otomai', 3]],
  metalogros: [],
  content: [
    ['dofus', 'Dofus Ocre', '/dofus-ocre', '/img/huevo.webp'],
    ['pagina', 'Emotes', '/emotes', null],
  ],
}

function render(node: React.ReactNode) {
  const holder = document.createElement('div')
  holder.innerHTML = renderToStaticMarkup(node)
  return holder
}

describe('searchPageQuery', () => {
  it('toma el primer q, sin espacios de sobra y con un tope de largo', () => {
    expect(searchPageQuery(undefined)).toBe('')
    expect(searchPageQuery('  ocre ')).toBe('ocre')
    expect(searchPageQuery(['ocre', 'otro'])).toBe('ocre')
    expect(searchPageQuery('a'.repeat(500))).toHaveLength(100)
  })
})

describe('searchPageView', () => {
  it('sin texto pide qué buscar; con una letra, otra más', () => {
    expect(searchPageView(null, '')).toEqual({ kind: 'empty', query: '' })
    expect(searchPageView(null, 'o')).toEqual({ kind: 'short', query: 'o' })
  })

  it('agrupa y ordena como la búsqueda de la portada', () => {
    const view = searchPageView(index, 'ocre')
    const hero = heroResults(siteEntries(index), 'ocre')
    expect(view).toEqual({
      kind: 'results',
      query: 'ocre',
      groups: hero.groups,
      status: hero.status,
    })
    expect(view.kind === 'results' && view.groups.map((g) => g.type)).toEqual([
      'mision',
      'logro',
      'dofus',
    ])
  })

  it('sin resultados lo dice con la línea de la portada', () => {
    const view = searchPageView(index, 'zzz')
    expect(view).toMatchObject({ kind: 'results', groups: [] })
    expect(view.kind === 'results' && view.status).toContain('«zzz»')
  })
})

describe('SearchPage', () => {
  it('un formulario que vuelve a /buscar con el texto buscado', () => {
    const page = render(<SearchPage view={searchPageView(index, 'ocre')} />)
    expect(page.querySelectorAll('h1')).toHaveLength(1)
    const form = page.querySelector('form')!
    expect(form.getAttribute('action')).toBe('/buscar')
    expect(form.getAttribute('role')).toBe('search')
    const input = form.querySelector<HTMLInputElement>('input[name="q"]')!
    expect(input.getAttribute('value')).toBe('ocre')
    expect(page.querySelector(`label[for="${input.id}"]`)).not.toBeNull()
    expect(form.querySelector('button[type="submit"]')).not.toBeNull()
  })

  it('los resultados en sus grupos, con lo que encaja marcado', () => {
    const page = render(<SearchPage view={searchPageView(index, 'ocre')} />)
    const headings = [...page.querySelectorAll('h2')].map((h) => h.textContent)
    expect(headings).toEqual(['Misiones', 'Logros', 'Dofus'])
    const hrefs = [...page.querySelectorAll('section a')].map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual(['/el-ocre-perdido', '/almas-del-ocre', '/dofus-ocre'])
    expect(page.querySelector('mark.hit')?.textContent).toBe('ocre')
    expect(page.querySelector('[role="status"]')?.textContent).toMatch(/1 misión/)
  })

  it('sin texto o con una letra: un aviso corto y el campo, sin lista', () => {
    for (const query of ['', 'o']) {
      const page = render(<SearchPage view={searchPageView(null, query)} />)
      expect(page.querySelector('input[name="q"]')).not.toBeNull()
      expect(page.querySelector('section')).toBeNull()
      expect(page.querySelector('[role="status"]')?.textContent).not.toBe('')
    }
  })
})
