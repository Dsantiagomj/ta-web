'use client'

import { useEffect } from 'react'

import {
  markMatches,
  searchIndex,
  searchWords,
  type IndexSearchData,
  type IndexSearchResult,
} from '@/lib/achievements/metalogros-search'
import { metalogrosStrings as s } from '@/lib/achievements/strings'

const CLOSE =
  '<svg viewBox="0 0 18 18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M4.5 4.5l9 9M13.5 4.5l-9 9"/></svg>'

/**
 * Las fichas: de enlaces (sin JavaScript) a botones que abren un panel con los logros de la
 * zona, a lo ancho de su fila y justo debajo. El ancla de la URL sigue al panel (#astrub) y
 * atrás y adelante funcionan; Esc o «Cerrar» lo cierran y devuelven el foco a la ficha.
 * Devuelve cómo abrir una zona desde el buscador y cómo deshacer lo que hizo.
 */
function enhanceTiles(root: HTMLElement) {
  // Un elemento de la lista de fichas con la región dentro: una lista solo admite elementos.
  const panel = document.createElement('li')
  panel.className = 'vd-panel'
  panel.hidden = true
  const region = document.createElement('div')
  region.id = 'zona-panel'
  region.setAttribute('role', 'region')
  panel.append(region)
  const tiles = new Map<string, HTMLButtonElement>()
  let open: HTMLButtonElement | null = null

  for (const link of root.querySelectorAll<HTMLAnchorElement>('a.vd-tile')) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = link.className
    button.dataset.zone = link.dataset.zone
    button.innerHTML = link.innerHTML
    button.setAttribute('aria-expanded', 'false')
    button.setAttribute('aria-controls', region.id)
    link.replaceWith(button)
    tiles.set(button.dataset.zone ?? '', button)
  }

  // Tras la última ficha de la fila de la que se abre, en su propia rejilla.
  function place(tile: HTMLElement) {
    const cell = tile.parentElement!
    const grid = cell.parentElement!
    let last = cell
    for (let next = cell.nextElementSibling; next; next = next.nextElementSibling) {
      if (next === panel) continue
      if ((next as HTMLElement).offsetTop !== cell.offsetTop) break
      last = next as HTMLElement
    }
    panel.remove()
    grid.insertBefore(panel, last.nextElementSibling)
  }

  function hide({ push = false, focus = false } = {}) {
    open?.setAttribute('aria-expanded', 'false')
    const was = open
    open = null
    panel.hidden = true
    if (push) history.pushState(null, '', location.pathname + location.search)
    if (focus) was?.focus()
  }

  function show(anchor: string, { push = false, scroll = false, focusTitle = false } = {}) {
    const tile = tiles.get(anchor)
    const source = document.getElementById(anchor)
    // Una zona apagada no tiene panel.
    if (!tile || !source) return hide()
    if (open && open !== tile) open.setAttribute('aria-expanded', 'false')
    open = tile
    tile.setAttribute('aria-expanded', 'true')
    const name = tile.querySelector('.vd-tile__n')?.textContent ?? ''
    region.innerHTML = source.innerHTML
    const close = document.createElement('button')
    close.type = 'button'
    close.className = 'vd-close'
    close.setAttribute('aria-label', s.close(name))
    close.innerHTML = CLOSE
    region.prepend(close)
    const title = region.querySelector<HTMLElement>('.zone__t')
    if (title) {
      title.id = 'zona-panel-t'
      region.setAttribute('aria-labelledby', title.id)
    }
    place(tile)
    panel.hidden = false
    if (push) history.pushState(null, '', `#${anchor}`)
    if (scroll) {
      const box = panel.getBoundingClientRect()
      if (box.bottom > innerHeight || box.top < 0) {
        panel.scrollIntoView({ block: box.height < innerHeight * 0.8 ? 'end' : 'start' })
      }
    }
    if (focusTitle) title?.focus({ preventScroll: true })
  }

  const onClick = (event: MouseEvent) => {
    const target = event.target as Element
    const tile = target.closest<HTMLButtonElement>('button.vd-tile')
    if (tile) {
      if (tile.getAttribute('aria-expanded') === 'true') hide({ push: true })
      else show(tile.dataset.zone ?? '', { push: true, scroll: true })
      return
    }
    if (target.closest('.vd-close')) hide({ push: true, focus: true })
  }
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !open) return
    if (panel.contains(document.activeElement) || document.activeElement === open) {
      event.preventDefault()
      hide({ push: true, focus: true })
    }
  }
  const fromUrl = () => {
    const anchor = decodeURIComponent(location.hash.slice(1))
    if (tiles.has(anchor)) show(anchor, { scroll: true })
    else hide()
  }
  let timer: ReturnType<typeof setTimeout> | undefined
  const onResize = () => {
    clearTimeout(timer)
    timer = setTimeout(() => open && place(open), 120)
  }

  root.addEventListener('click', onClick)
  document.addEventListener('keydown', onKey)
  addEventListener('popstate', fromUrl)
  addEventListener('resize', onResize)
  fromUrl()

  return {
    openZone(anchor: string) {
      const tile = tiles.get(anchor)
      if (!tile) return
      tile.scrollIntoView({ block: 'nearest' })
      show(anchor, { push: true, scroll: true, focusTitle: true })
    },
    cleanup() {
      root.removeEventListener('click', onClick)
      document.removeEventListener('keydown', onKey)
      removeEventListener('popstate', fromUrl)
      removeEventListener('resize', onResize)
      clearTimeout(timer)
    },
  }
}

/**
 * El buscador (WAI-ARIA APG, combobox con listbox): al escribir enseña zonas, logros y
 * misiones; las flechas mueven aria-activedescendant saltando lo que está En preparación,
 * Intro abre y Esc cierra y luego borra. Una zona abre su panel; lo demás, su página.
 */
function enhanceSearch(openZone: (anchor: string) => void) {
  const input = document.getElementById('metalogros-q') as HTMLInputElement | null
  const list = document.getElementById('metalogros-list')
  const status = document.getElementById('metalogros-st')
  const json = document.getElementById('metalogros-data')?.textContent
  if (!input || !list || !status || !json) return () => {}
  const data = JSON.parse(json) as IndexSearchData
  let results: IndexSearchResult[] = []
  let active = -1

  const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  function render() {
    const words = searchWords(input!.value)
    list!.innerHTML = results
      .map(
        (result, index) =>
          `<li role="option" id="metalogros-o${index}" class="combo__opt${result.off ? ' combo__opt--off' : ''}"` +
          ` aria-selected="${index === active}"${result.off ? ' aria-disabled="true"' : ''} data-i="${index}">` +
          `<span class="combo__k">${s.kinds[result.kind]}</span>` +
          `<span class="combo__n">${markMatches(result.name, words)}` +
          `${result.off ? ` <span class="combo__tag">${s.preparing}</span>` : ''}</span>` +
          `<span class="combo__m">${escape(result.meta)}</span></li>`,
      )
      .join('')
    const shown = results.length > 0
    list!.hidden = !shown
    input!.setAttribute('aria-expanded', String(shown))
    if (active >= 0) {
      input!.setAttribute('aria-activedescendant', `metalogros-o${active}`)
      document.getElementById(`metalogros-o${active}`)?.scrollIntoView({ block: 'nearest' })
    } else input!.removeAttribute('aria-activedescendant')
  }

  function update() {
    results = searchIndex(data, input!.value)
    active = -1
    render()
    const query = input!.value.trim()
    status!.textContent =
      query.length < 2
        ? ''
        : results.length === 0
          ? s.noResults(query)
          : s.resultsCount(results.length)
  }
  function close() {
    results = []
    active = -1
    render()
  }
  function go(result: IndexSearchResult) {
    close()
    if (result.href.startsWith('#')) openZone(result.href.slice(1))
    else location.href = result.href
  }

  const onInput = () => update()
  const onFocus = () => {
    if (input.value.trim().length >= 2) update()
  }
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!results.length) update()
      const step = event.key === 'ArrowDown' ? 1 : -1
      const count = results.length
      let index = active
      for (let tries = 0; tries < count; tries += 1) {
        index = index < 0 ? (step > 0 ? 0 : count - 1) : (index + step + count) % count
        if (!results[index]!.off) {
          active = index
          break
        }
      }
      render()
    } else if (event.key === 'Enter') {
      const chosen = active >= 0 ? results[active] : undefined
      const usable = results.filter((result) => !result.off)
      if (chosen && !chosen.off) {
        event.preventDefault()
        go(chosen)
      } else if (active < 0 && usable.length === 1) {
        event.preventDefault()
        go(usable[0]!)
      }
    } else if (event.key === 'Escape') {
      if (results.length) {
        event.preventDefault()
        close()
      } else if (input.value) {
        event.preventDefault()
        input.value = ''
        update()
      }
    }
  }
  let blurTimer: ReturnType<typeof setTimeout> | undefined
  const onBlur = () => {
    blurTimer = setTimeout(close, 120)
  }
  const onListDown = (event: MouseEvent) => event.preventDefault()
  const onListClick = (event: MouseEvent) => {
    const option = (event.target as Element).closest<HTMLElement>('.combo__opt')
    const result = option && results[Number(option.dataset.i)]
    if (result && !result.off) go(result)
  }

  input.addEventListener('input', onInput)
  input.addEventListener('focus', onFocus)
  input.addEventListener('keydown', onKey)
  input.addEventListener('blur', onBlur)
  list.addEventListener('mousedown', onListDown)
  list.addEventListener('click', onListClick)
  // En escritorio con ratón el buscador es la página: se lleva el foco. Nunca en pantallas táctiles.
  if (matchMedia('(min-width: 64rem) and (pointer: fine)').matches && !location.hash) {
    input.focus({ preventScroll: true })
  }
  return () => {
    input.removeEventListener('input', onInput)
    input.removeEventListener('focus', onFocus)
    input.removeEventListener('keydown', onKey)
    input.removeEventListener('blur', onBlur)
    list.removeEventListener('mousedown', onListDown)
    list.removeEventListener('click', onListClick)
    clearTimeout(blurTimer)
  }
}

/**
 * La isla del índice de metalogros: el panel de las fichas y el buscador. No pinta nada: da
 * comportamiento al HTML del servidor, que funciona sin ella (las fichas son enlaces).
 */
export function MetalogrosIsland() {
  // Sincroniza con el DOM que pintó el servidor: fichas, panel, buscador y la URL.
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.idx.vd')
    if (!root) return
    const tiles = enhanceTiles(root)
    const stopSearch = enhanceSearch(tiles.openZone)
    return () => {
      tiles.cleanup()
      stopSearch()
    }
  }, [])
  return null
}
