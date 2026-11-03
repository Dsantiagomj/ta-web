'use client'

import { useSyncExternalStore } from 'react'

import { MODE_COOKIE, type Mode, modeCookie, resolveMode } from '@/lib/theme/theme'

import { modeToggleStrings } from './strings'

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
  listeners.forEach((listener) => listener())
}

export function ModeToggle({ initialMode }: { initialMode: Mode }) {
  const mode = useSyncExternalStore(subscribe, currentMode, () => initialMode)
  const light = mode === 'light'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={light}
      onClick={() => applyMode(light ? 'dark' : 'light')}
      className="group inline-flex h-10 cursor-pointer items-center gap-3 rounded-pill bg-raised px-4 text-sm font-semibold text-ink transition-transform duration-(--duration-press) ease-out active:scale-96 pointer-coarse:h-11"
    >
      <span
        aria-hidden="true"
        className="relative h-5 w-9 rounded-pill border border-line bg-bg transition-colors duration-(--duration-fast)"
      >
        <span className="absolute top-0.5 left-0.5 size-3.5 rounded-full border-2 border-accent bg-ink transition-transform duration-(--duration-fast) ease-out group-aria-checked:translate-x-4" />
      </span>
      {modeToggleStrings.label}
    </button>
  )
}
