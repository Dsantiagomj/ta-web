'use client'

import { type CSSProperties, useRef, useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'

import { MODE_COOKIE, type Mode, modeCookie, resolveMode } from '@/lib/theme/theme'

import './mode-toggle.css'
import { EGG_SIZE, eggSrcSet, modeEggs, modeSwitchTitle, modeToggleStrings } from './strings'

// El modo vive en <html data-mode>. El servidor lo pinta desde la cookie y el script
// inline del <head> lo corrige antes del primer pintado; este interruptor lo lee de ahí.
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function currentMode(): Mode {
  return resolveMode(document.documentElement.getAttribute('data-mode'))
}

function applyMode(mode: Mode) {
  document.documentElement.setAttribute('data-mode', mode)
  document.cookie = modeCookie(mode)
  try {
    localStorage.setItem(MODE_COOKIE, mode)
  } catch {
    // Modo privado estricto: la cookie basta.
  }
  flushSync(() => listeners.forEach((listener) => listener()))
}

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

/** Reinicia una animación CSS quitando y volviendo a poner su clase. */
function restartClass(element: Element | null, className: string) {
  if (!element) return
  element.classList.remove(className)
  void (element as HTMLElement).offsetWidth
  element.classList.add(className)
}

/** Cambia el modo con la entrada en diagonal donde hay View Transitions; si no, sin más. */
function changeMode(next: Mode) {
  if (reducedMotion() || !document.startViewTransition) return applyMode(next)
  const root = document.documentElement
  const className = next === 'dark' ? 'vt-to-dark' : 'vt-to-light'
  root.classList.add(className)
  document
    .startViewTransition(() => applyMode(next))
    .finished.finally(() => root.classList.remove(className))
}

// Desplazamiento final de cada chispa, en rem (px ÷ 16): crece con la fuente raíz.
const SPARKS = [
  [0, -0.875],
  [0.75, -0.5],
  [0.8125, 0.4375],
  [0, 0.875],
  [-0.75, 0.5],
  [-0.8125, -0.4375],
] as const

export function ModeToggle({ initialMode }: { initialMode: Mode }) {
  const mode = useSyncExternalStore(subscribe, currentMode, () => initialMode)
  const button = useRef<HTMLButtonElement>(null)
  const light = mode === 'light'

  function toggle() {
    const next: Mode = light ? 'dark' : 'light'
    if (!reducedMotion() && button.current) {
      // Cada huevo lleva solo la animación de este cambio: la del anterior no puede pisarla
      for (const egg of button.current.querySelectorAll('[data-egg]'))
        egg.classList.remove('arc-up', 'hatch')
      restartClass(button.current.querySelector(`[data-egg="${mode}"]`), 'arc-up')
      restartClass(button.current.querySelector(`[data-egg="${next}"]`), 'hatch')
      restartClass(button.current, 'pop')
    }
    changeMode(next)
  }

  return (
    <button
      ref={button}
      type="button"
      role="switch"
      aria-checked={light}
      aria-label={modeToggleStrings.label}
      title={modeSwitchTitle(mode)}
      onClick={toggle}
      className="mode-switch"
    >
      <span data-part="track" aria-hidden="true" />
      <span data-part="knob" aria-hidden="true" />
      {(['light', 'dark'] as const).map((egg) => (
        <picture key={egg}>
          <source type="image/avif" srcSet={eggSrcSet(modeEggs[egg], 'avif')} />
          <source type="image/webp" srcSet={eggSrcSet(modeEggs[egg], 'webp')} />
          {/* Variantes pregeneradas: sin optimización de imágenes (AGENTS.md, Media). */}
          <img
            data-part="egg"
            data-egg={egg}
            src={`${modeEggs[egg].file}-${EGG_SIZE}.webp`}
            srcSet={eggSrcSet(modeEggs[egg], 'webp')}
            width={EGG_SIZE}
            height={EGG_SIZE}
            alt=""
            aria-hidden="true"
            draggable={false}
            decoding="async"
          />
        </picture>
      ))}
      {SPARKS.map(([dx, dy]) => (
        <span
          key={`${dx},${dy}`}
          data-part="spark"
          aria-hidden="true"
          style={{ '--dx': `${dx}rem`, '--dy': `${dy}rem` } as CSSProperties}
        />
      ))}
    </button>
  )
}
