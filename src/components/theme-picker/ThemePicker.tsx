'use client'

import { type KeyboardEvent, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'

import { EMBLEM_ART } from '@/components/brand/emblem-art'
import {
  FREE_THEMES,
  type FreeTheme,
  type Mode,
  resolveMode,
  resolveTheme,
  type Theme,
  THEME_COOKIE,
  themeCookie,
} from '@/lib/theme/theme'

import { themeNames, themePickerLabel, themePickerStrings as s } from './strings'

// El selector de tema de la cabecera (DESIGN.md, Theme picker). El tema vive en
// <html data-theme>: el servidor lo pinta desde la cookie y el script del <head> lo corrige
// antes del primer pintado. Los estilos van en theme-picker.css, que importa site.css.

/** Avisa cuando cambia el tema o el modo de <html>, lo cambie quien lo cambie. */
function subscribe(listener: () => void) {
  const observer = new MutationObserver(listener)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'data-mode'],
  })
  return () => observer.disconnect()
}

function snapshot() {
  const root = document.documentElement
  return `${root.getAttribute('data-theme')} ${root.getAttribute('data-mode')}`
}

function applyTheme(theme: FreeTheme) {
  document.documentElement.setAttribute('data-theme', theme)
  document.cookie = themeCookie(theme)
  try {
    localStorage.setItem(THEME_COOKIE, theme)
  } catch {
    // Modo privado estricto: la cookie basta.
  }
}

/** Cambia el tema con un fundido de los colores donde hay View Transitions; si no, sin más. */
function changeTheme(next: FreeTheme) {
  const root = document.documentElement
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !document.startViewTransition)
    return applyTheme(next)
  root.classList.add('vt-tema')
  document
    .startViewTransition(() => applyTheme(next))
    .finished.finally(() => root.classList.remove('vt-tema'))
}

function Hat({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 3 64 39" aria-hidden="true" focusable="false">
      <path d={EMBLEM_ART.hat} />
    </svg>
  )
}

export function ThemePicker({
  initialTheme,
  initialMode,
}: {
  initialTheme: Theme
  initialMode: Mode
}) {
  const state = useSyncExternalStore(subscribe, snapshot, () => `${initialTheme} ${initialMode}`)
  const [rawTheme, rawMode] = state.split(' ')
  const theme = resolveTheme(rawTheme, { premium: true })
  const mode = resolveMode(rawMode)
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const headId = useId()

  const items = () => [
    ...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? []),
  ]

  /** Abre el menú y pone el foco en el tema actual, el primero o el último. */
  function show(focus: 'checked' | 'last') {
    flushSync(() => setOpen(true))
    const list = items()
    const checked = list.find((item) => item.getAttribute('aria-checked') === 'true')
    ;(focus === 'last' ? list.at(-1) : (checked ?? list[0]))?.focus()
  }

  function onButtonKey(event: KeyboardEvent) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    show(event.key === 'ArrowUp' ? 'last' : 'checked')
  }

  function onMenuKey(event: KeyboardEvent) {
    if (event.key === 'Tab') return setOpen(false)
    const list = items()
    const at = list.indexOf(document.activeElement as HTMLElement)
    const next = {
      ArrowDown: (at + 1) % list.length,
      ArrowUp: (at - 1 + list.length) % list.length,
      Home: 0,
      End: list.length - 1,
    }[event.key]
    if (next === undefined) return
    event.preventDefault()
    list[next].focus()
  }

  useEffect(() => {
    if (!open) return
    // Escuchas del documento (el DOM) mientras el menú está abierto: Escape y el clic fuera
    // lo cierran y devuelven el foco al botón, salvo que el clic lo haya llevado a otro sitio.
    function onClick(event: MouseEvent) {
      if (wrap.current?.contains(event.target as Node)) return
      setOpen(false)
      const active = document.activeElement
      if (!active || active === document.body) button.current?.focus()
    }
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key !== 'Escape') return
      setOpen(false)
      button.current?.focus()
    }
    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="tp" ref={wrap}>
      <button
        ref={button}
        type="button"
        className="tp-btn"
        aria-label={themePickerLabel(theme)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => (open ? setOpen(false) : show('checked'))}
        onKeyDown={onButtonKey}
      >
        <Hat className="tp-hat" />
        <svg className="tp-chev" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
          <path d="M3 4.5l3 3 3-3" />
        </svg>
      </button>
      <div className="tp-pop" hidden={!open}>
        <p className="tp-pop__h" id={headId}>
          {s.menu}
        </p>
        <div id={menuId} role="menu" aria-labelledby={headId} ref={menu} onKeyDown={onMenuKey}>
          {FREE_THEMES.map((option) => (
            <button
              key={option}
              type="button"
              role="menuitemradio"
              aria-checked={option === theme}
              tabIndex={-1}
              className="tp-opt"
              onClick={() => changeTheme(option)}
            >
              <span className="tp-sw" data-theme={option} data-mode={mode} aria-hidden="true">
                <Hat />
              </span>
              <span className="tp-name">{themeNames[option]}</span>
              <svg className="tp-check" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <path d="M3 8.5l3 3 7-7" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
