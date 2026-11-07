'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { DoorIcon, SearchIcon } from './icons'
import type { SearchEntry } from './nav'
import { searchNav } from './search'
import { StaticImg } from './StaticImg'
import { siteShellStrings } from './strings'

const s = siteShellStrings.searchDialog

/** Lo que tenía el foco al abrir cada diálogo: lo recupera al cerrarlo. */
const openers: { sheet: HTMLElement | null; search: HTMLElement | null } = {
  sheet: null,
  search: null,
}

function closePanels(except?: HTMLButtonElement, restore = false) {
  for (const button of document.querySelectorAll<HTMLButtonElement>('.np[aria-expanded="true"]')) {
    if (button === except) continue
    button.setAttribute('aria-expanded', 'false')
    document.getElementById(button.getAttribute('aria-controls') ?? '')?.setAttribute('hidden', '')
    if (restore) button.focus()
  }
}

function togglePanel(button: HTMLButtonElement) {
  const open = button.getAttribute('aria-expanded') !== 'true'
  closePanels(button)
  button.setAttribute('aria-expanded', String(open))
  const panel = document.getElementById(button.getAttribute('aria-controls') ?? '')
  if (open) panel?.removeAttribute('hidden')
  else panel?.setAttribute('hidden', '')
}

const PANEL_KEYS = ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'End']

/**
 * Flechas, Inicio y Fin dentro del panel abierto (DESIGN.md, Dropdown panel): desde su
 * botón, abajo entra al primer enlace; dentro, recorren sus enlaces y botones en orden.
 */
function movePanelFocus(event: KeyboardEvent, button: HTMLButtonElement) {
  if (!PANEL_KEYS.includes(event.key)) return
  const panel = document.getElementById(button.getAttribute('aria-controls') ?? '')
  if (!panel) return
  const items = [...panel.querySelectorAll<HTMLElement>('a[href], button')]
  const at = items.indexOf(document.activeElement as HTMLElement)
  if (at === -1 && document.activeElement !== button) return
  if (items.length === 0) return
  event.preventDefault()
  const last = items.length - 1
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? last
        : ['ArrowDown', 'ArrowRight'].includes(event.key)
          ? Math.min(at + 1, last)
          : Math.max(at - 1, 0)
  items[next].focus()
}

/** El atajo no salta mientras se escribe en un campo. */
const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

/**
 * La isla de la cabecera (DESIGN.md, Layout: Header y Search dialog). Escucha con
 * delegación: abre y cierra los paneles del menú (Esc, clic fuera o el foco que sale los
 * cierran), el menú del móvil y sus secciones, y la búsqueda (Ctrl K o /). Mientras no
 * hay búsqueda de guías, busca en lo que enlaza el menú. Marca la cabecera al bajar la
 * página para que pase a opaca.
 */
export function HeaderIsland({ index }: { index: SearchEntry[] }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const groups = useMemo(() => searchNav(index, query), [index, query])
  const found = groups.reduce((n, g) => n + g.items.length, 0)

  // Escucha los clics, las teclas, el foco y el scroll del documento (delegación).
  useEffect(() => {
    const header = document.querySelector<HTMLElement>('[data-site-header]')
    const sheet = document.getElementById('site-sheet') as HTMLDialogElement | null

    const openSearch = (from: HTMLElement | null) => {
      if (!dialog.current || dialog.current.open) return
      closePanels()
      if (sheet?.open) {
        // Lo que abrió la búsqueda queda dentro del menú cerrado: el foco vuelve a lo que
        // abrió el menú, la hamburguesa.
        openers.search = openers.sheet
        openers.sheet = null
        sheet.close()
      } else {
        // Desde un panel, el botón que lo abrió: el panel se cierra y su botón no se ve.
        const panel = from?.closest('.panel')
        openers.search = panel
          ? document.querySelector<HTMLElement>(`.np[aria-controls="${panel.id}"]`)
          : from
      }
      dialog.current.showModal()
      input.current?.focus()
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const panelButton = target.closest<HTMLButtonElement>('.np')
      if (panelButton) return togglePanel(panelButton)
      const search = target.closest<HTMLElement>('[data-open-search]')
      if (search) return openSearch(search)
      const burger = target.closest<HTMLElement>('[data-open-sheet]')
      if (burger && sheet) {
        openers.sheet = burger
        return sheet.showModal()
      }
      if (target.closest('[data-close-sheet]')) return sheet?.close()
      const fold = target.closest<HTMLButtonElement>('.stile__b')
      if (fold) {
        const open = fold.getAttribute('aria-expanded') !== 'true'
        fold.setAttribute('aria-expanded', String(open))
        document
          .getElementById(fold.getAttribute('aria-controls') ?? '')
          ?.toggleAttribute('hidden', !open)
        return
      }
      if (!target.closest('.panel')) closePanels()
    }

    const onKey = (event: KeyboardEvent) => {
      const k = event.key.toLowerCase()
      if ((k === 'k' && (event.ctrlKey || event.metaKey)) || (k === '/' && !typing(event.target))) {
        event.preventDefault()
        return openSearch(document.activeElement as HTMLElement | null)
      }
      const open = document.querySelector<HTMLButtonElement>('.np[aria-expanded="true"]')
      if (!open) return
      if (event.key === 'Escape') return closePanels(undefined, true)
      movePanelFocus(event, open)
    }

    // Un panel se cierra cuando el foco sale de su elemento del menú.
    const onFocusOut = (event: FocusEvent) => {
      const item = (event.target as HTMLElement).closest('.site-nav__item')
      if (item && !item.contains(event.relatedTarget as Node | null)) closePanels()
    }

    const onScroll = () => header?.classList.toggle('is-scrolled', window.scrollY > 8)
    const restore = (which: keyof typeof openers) => () => {
      openers[which]?.focus()
      openers[which] = null
    }
    const restoreSheet = restore('sheet')
    const restoreSearch = restore('search')

    onScroll()
    // Las pruebas esperan a esta marca antes de usar el teclado.
    header?.setAttribute('data-ready', '')
    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKey)
    document.addEventListener('focusout', onFocusOut)
    window.addEventListener('scroll', onScroll, { passive: true })
    sheet?.addEventListener('close', restoreSheet)
    const search = dialog.current
    search?.addEventListener('close', restoreSearch)
    return () => {
      document.removeEventListener('click', onClick)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('focusout', onFocusOut)
      window.removeEventListener('scroll', onScroll)
      sheet?.removeEventListener('close', restoreSheet)
      search?.removeEventListener('close', restoreSearch)
    }
  }, [])

  // Flechas: del campo al primer resultado y entre resultados.
  function onResultsKey(event: React.KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    const links = [...(dialog.current?.querySelectorAll<HTMLAnchorElement>('.sdlg__list a') ?? [])]
    if (links.length === 0) return
    event.preventDefault()
    const at = links.indexOf(document.activeElement as HTMLAnchorElement)
    if (at === -1) return links[event.key === 'ArrowDown' ? 0 : links.length - 1].focus()
    const next = at + (event.key === 'ArrowDown' ? 1 : -1)
    if (next < 0) input.current?.focus()
    else links[Math.min(next, links.length - 1)].focus()
  }

  const shown = query.trim()
    ? groups
    : [{ type: 'seccion' as const, items: index.filter((e) => e.type === 'seccion') }]
  const status = !query.trim() ? '' : found === 0 ? s.none(query.trim()) : s.found(found)

  return (
    <dialog
      ref={dialog}
      className="sdlg"
      id="buscar"
      aria-label={s.label}
      onKeyDown={onResultsKey}
      onClick={(event) => {
        // Un clic en el fondo, fuera de la caja, la cierra.
        if (event.target === dialog.current) dialog.current.close()
      }}
    >
      <form className="sdlg__f" role="search" onSubmit={(event) => event.preventDefault()}>
        <label className="sr-only" htmlFor="buscar-q">
          {s.input}
        </label>
        <SearchIcon className="sdlg__i" />
        <input
          ref={input}
          id="buscar-q"
          type="search"
          autoComplete="off"
          spellCheck={false}
          placeholder={s.placeholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-describedby="buscar-st"
        />
        <button type="button" className="sdlg__x" onClick={() => dialog.current?.close()}>
          {s.close}
        </button>
      </form>
      <p className="sdlg__st" id="buscar-st" role="status">
        {status}
      </p>
      <div className="sdlg__list">
        {shown.map((group) => (
          <section key={group.type} aria-labelledby={`buscar-g-${group.type}`}>
            <h2 className="sdlg__h" id={`buscar-g-${group.type}`}>
              {query.trim() ? s.types[group.type] : s.goTo}
            </h2>
            <ul role="list">
              {group.items.map((item) => (
                <li key={item.href + item.name}>
                  <a href={item.href}>
                    <span className="site-well" aria-hidden="true">
                      {item.image ? (
                        <StaticImg src={item.image.src} width={26} height={26} alt="" />
                      ) : (
                        <DoorIcon />
                      )}
                    </span>
                    <span>{item.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </dialog>
  )
}
