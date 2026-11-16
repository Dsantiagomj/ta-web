import {
  type FreeTheme,
  isFreeTheme,
  resolveTheme,
  THEME_COOKIE,
  themeCookie,
} from '@/lib/theme/theme'

import { themePickerLabel } from './strings'

// Lo que hace el selector de tema de la cabecera (ThemePicker.tsx). HeaderIsland lo carga
// con import() la primera vez que se usa el botón, así que no pesa en la carga de la página.

type Focus = 'checked' | 'last'

const root = document.documentElement
const installed = new WeakSet<HTMLElement>()

function parts(wrap: HTMLElement) {
  return {
    button: wrap.querySelector<HTMLButtonElement>('.tp-btn')!,
    pop: wrap.querySelector<HTMLElement>('.tp-pop')!,
    items: [...wrap.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]')],
  }
}

/** Pone el botón, la marca y las muestras al día con el tema y el modo de <html>. */
export function sync(wrap: HTMLElement) {
  const theme = resolveTheme(root.getAttribute('data-theme'), { premium: true })
  const mode = root.getAttribute('data-mode') ?? 'dark'
  const { button, items } = parts(wrap)
  wrap.setAttribute('data-current', theme)
  button.setAttribute('aria-label', themePickerLabel(theme))
  for (const item of items) {
    item.setAttribute('aria-checked', String(item.dataset.setTheme === theme))
    item.querySelector('[data-theme]')?.setAttribute('data-mode', mode)
  }
}

function applyTheme(theme: FreeTheme) {
  root.setAttribute('data-theme', theme)
  document.cookie = themeCookie(theme)
  try {
    localStorage.setItem(THEME_COOKIE, theme)
  } catch {
    // Modo privado estricto: la cookie basta.
  }
}

/** Cambia el tema con un fundido de los colores donde hay View Transitions; si no, sin más. */
function changeTheme(next: FreeTheme) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !document.startViewTransition)
    return applyTheme(next)
  root.classList.add('vt-tema')
  document
    .startViewTransition(() => applyTheme(next))
    .finished.finally(() => root.classList.remove('vt-tema'))
}

function isOpen(wrap: HTMLElement) {
  return !parts(wrap).pop.hidden
}

function close(wrap: HTMLElement, returnFocus: boolean) {
  const { button, pop } = parts(wrap)
  if (pop.hidden) return
  pop.hidden = true
  button.setAttribute('aria-expanded', 'false')
  if (returnFocus) button.focus()
}

/** Abre el menú con el foco en el tema actual o en el último. */
export function open(wrap: HTMLElement, focus: Focus = 'checked') {
  install(wrap)
  sync(wrap)
  const { button, pop, items } = parts(wrap)
  pop.hidden = false
  button.setAttribute('aria-expanded', 'true')
  const checked = items.find((item) => item.getAttribute('aria-checked') === 'true')
  ;(focus === 'last' ? items.at(-1) : (checked ?? items[0]))?.focus()
}

export function toggle(wrap: HTMLElement) {
  if (isOpen(wrap)) close(wrap, false)
  else open(wrap)
}

/** Las escuchas del menú y del documento, una sola vez por selector. */
function install(wrap: HTMLElement) {
  if (installed.has(wrap)) return
  installed.add(wrap)
  const { pop, items } = parts(wrap)

  pop.addEventListener('click', (event) => {
    const theme = (event.target as HTMLElement).closest<HTMLElement>('[data-set-theme]')?.dataset
      .setTheme
    if (isFreeTheme(theme)) changeTheme(theme)
  })

  pop.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') return close(wrap, false)
    const at = items.indexOf(document.activeElement as HTMLButtonElement)
    const next = {
      ArrowDown: (at + 1) % items.length,
      ArrowUp: (at - 1 + items.length) % items.length,
      Home: 0,
      End: items.length - 1,
    }[event.key]
    if (next === undefined) return
    event.preventDefault()
    items[next].focus()
  })

  // Escape y un clic fuera cierran y devuelven el foco al botón, salvo que el clic lo haya
  // llevado a otro sitio.
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen(wrap)) close(wrap, true)
  })
  document.addEventListener('click', (event) => {
    if (!isOpen(wrap) || wrap.contains(event.target as Node)) return
    const active = document.activeElement
    close(wrap, !active || active === document.body)
  })

  // El tema o el modo pueden cambiar con el menú abierto (el interruptor de modo).
  new MutationObserver(() => sync(wrap)).observe(root, {
    attributes: true,
    attributeFilter: ['data-theme', 'data-mode'],
  })
}
