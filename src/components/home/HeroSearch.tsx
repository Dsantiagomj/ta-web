'use client'

import { type ReactNode, useEffect, useRef, useState } from 'react'

import type { SearchEntry } from '@/components/site/nav'
import type { GuidesState } from '@/components/site/search'
import { queryKind } from '@/components/site/search-query'
import { searchDialogStrings as notes } from '@/components/site/search-strings'

import { HERO_SEARCH_ID as ID, heroSearchStrings as s, optionId } from './hero-search-strings'

type Results = typeof import('./HeroResults')

/** El alto máximo del panel: lo que queda hasta el final de lo visible (el teclado en el móvil). */
function fit(bar: HTMLElement | null, panel: HTMLElement | null) {
  if (!bar || !panel) return
  const view = window.visualViewport
  const bottom = view ? view.offsetTop + view.height : window.innerHeight
  const room = bottom - bar.getBoundingClientRect().bottom - 20
  panel.style.setProperty('--cbx-max', `${Math.max(180, Math.min(room, 440))}px`)
}

/**
 * La búsqueda de misiones de la portada (DESIGN.md, Home): el campo de un combobox con lista
 * (patrón ARIA APG) cuyos resultados flotan bajo él, así que abrirlo, escribir o cargar no
 * mueve nada de la página. El formulario, la etiqueta y la ayuda los pinta el servidor (Hero).
 * Las filas y el motor (HeroResults.tsx y search.ts) y el índice de las guías llegan con
 * import() la primera vez que el campo recibe el foco, nunca al cargar la página; el motor y
 * el índice son los del diálogo de la cabecera, con una sola petición entre los dos. Mientras
 * el campo se ve, el botón de búsqueda de la cabecera se aparta (html.hs-on).
 */
export function HeroSearch({ icon, arrow }: { icon: ReactNode; arrow: ReactNode }) {
  const bar = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const live = useRef<HTMLParagraphElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const rankTimer = useRef(0)
  const loading = useRef(false)
  const [query, setQuery] = useState('')
  // Lo que se ordena: el texto, 90 ms después de la última tecla (junta las teclas rápidas).
  const [ranked, setRanked] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [search, setSearch] = useState<{
    guides: GuidesState
    run?: Results
    quests?: SearchEntry[]
  }>({ guides: 'idle' })

  const kind = queryKind(query)
  const rankBy = queryKind(ranked) === 'search' ? ranked : query
  const results =
    kind === 'search' && search.run && search.quests
      ? search.run.rankQuests(search.quests, rankBy)
      : null
  const items = results?.items ?? []
  const state =
    kind === 'empty'
      ? 'empty'
      : kind === 'hint'
        ? 'hint'
        : search.guides === 'error'
          ? 'error'
          : results
            ? 'results'
            : 'loading'
  const status = results
    ? search.run!.questStatus(query, results.total)
    : state === 'hint'
      ? notes.hint
      : state === 'error'
        ? notes.guidesError
        : state === 'loading'
          ? notes.guidesLoading
          : ''
  const expanded = open && state !== 'empty'

  // Las filas, el motor y el índice, una vez; si fallaron, el siguiente foco lo reintenta.
  function start() {
    if (loading.current || search.guides === 'ready') return
    loading.current = true
    setSearch((current) => ({ ...current, guides: 'loading' }))
    import('./HeroResults')
      .then(async (run) =>
        setSearch({ guides: 'ready', run, quests: await run.loadQuestEntries() }),
      )
      .catch(() => setSearch((current) => ({ ...current, guides: 'error' })))
      .finally(() => {
        loading.current = false
      })
  }

  function show(value: string) {
    if (!value.trim()) return setOpen(false)
    if (open) return
    setOpen(true)
    // En el móvil, el campo sube hasta justo debajo de la cabecera para que los resultados
    // queden por encima del teclado. Es un desplazamiento, no un cambio de maquetación.
    if (matchMedia('(max-width: 39.99rem)').matches && bar.current) {
      const header = document.querySelector('[data-site-header]')
      const under = (header?.getBoundingClientRect().bottom ?? 64) + 12
      const top = bar.current.getBoundingClientRect().top + window.scrollY - under
      if (Math.abs(top - window.scrollY) > 4) {
        const still = matchMedia('(prefers-reduced-motion: reduce)').matches
        window.scrollTo({ top, behavior: still ? 'auto' : 'smooth' })
      }
      window.setTimeout(() => fit(bar.current, panel.current), 350)
    }
    fit(bar.current, panel.current)
  }

  function close() {
    setOpen(false)
    setActive(-1)
  }

  /** La elegida, o la primera: ordena ya lo escrito aunque la espera de 90 ms no acabara. */
  function pick(): SearchEntry | undefined {
    if (!search.run || !search.quests || kind !== 'search') return undefined
    const list = rankBy === query ? items : search.run.rankQuests(search.quests, query).items
    return list[active >= 0 ? active : 0]
  }

  function go(entry: SearchEntry | undefined, newTab: boolean) {
    if (!entry) return
    if (newTab) window.open(entry.href, '_blank', 'noopener')
    else window.location.assign(entry.href)
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    const n = items.length
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!expanded) return show(query)
      if (n === 0) return
      const down = event.key === 'ArrowDown'
      const next = active < 0 ? (down ? 0 : n - 1) : (active + (down ? 1 : -1) + n) % n
      setActive(next)
      requestAnimationFrame(() =>
        document.getElementById(optionId(next))?.scrollIntoView({ block: 'nearest' }),
      )
    } else if (event.key === 'Enter') {
      // Intro nunca envía el formulario mientras hay JavaScript.
      event.preventDefault()
      go(pick(), event.ctrlKey || event.metaKey)
    } else if (event.key === 'Escape') {
      if (expanded) {
        event.preventDefault()
        close()
      } else if (query) {
        event.preventDefault()
        setQuery('')
        setRanked('')
      }
    } else if (event.key === 'Tab') close()
  }

  // Escucha los clics fuera del formulario, el teclado del móvil (visualViewport) y si el
  // campo se ve, para apartar el botón de búsqueda de la cabecera (html.hs-on).
  useEffect(() => {
    const root = document.documentElement
    const form = bar.current?.closest('form')
    const onPointerDown = (event: PointerEvent) => {
      if (!form?.contains(event.target as Node)) {
        setOpen(false)
        setActive(-1)
      }
    }
    const onResize = () => {
      if (panel.current && !panel.current.hidden) fit(bar.current, panel.current)
    }
    const seen = new IntersectionObserver(
      ([entry]) => root.classList.toggle('hs-on', entry.isIntersecting),
      { rootMargin: '-64px 0px 0px 0px' },
    )
    if (bar.current) seen.observe(bar.current)
    // Con JavaScript, Intro y el botón eligen una misión; el formulario no se envía.
    const onSubmit = (event: Event) => event.preventDefault()
    form?.addEventListener('submit', onSubmit)
    document.addEventListener('pointerdown', onPointerDown)
    window.visualViewport?.addEventListener('resize', onResize)
    window.addEventListener('resize', onResize)
    return () => {
      seen.disconnect()
      root.classList.remove('hs-on')
      form?.removeEventListener('submit', onSubmit)
      document.removeEventListener('pointerdown', onPointerDown)
      window.visualViewport?.removeEventListener('resize', onResize)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  // Anuncia el estado al lector de pantalla (la región role="status") cuando se deja de
  // escribir; la línea visible se cambia al momento y está oculta para el lector.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (live.current) live.current.textContent = status
    }, 400)
    return () => window.clearTimeout(timer)
  }, [status])

  return (
    <div className="ask__field">
      <div className="ask__bar" ref={bar}>
        {icon}
        <input
          ref={input}
          id={ID}
          className="ask__in"
          type="text"
          name="q"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={`${ID}-lista`}
          aria-describedby={`${ID}-ayuda`}
          aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="go"
          placeholder={s.placeholder}
          value={query}
          onChange={(event) => {
            const value = event.target.value
            setQuery(value)
            setActive(-1)
            start()
            window.clearTimeout(rankTimer.current)
            rankTimer.current = window.setTimeout(() => setRanked(value), 90)
            show(value)
          }}
          onFocus={() => {
            start()
            show(query)
          }}
          onKeyDown={onKeyDown}
        />
        <button
          type="submit"
          className="ask__go"
          onClick={(event) => {
            event.preventDefault()
            const entry = pick()
            if (entry) return go(entry, event.ctrlKey || event.metaKey)
            input.current?.focus()
          }}
        >
          {s.submit}
          {arrow}
        </button>
      </div>
      <div className="cbx" ref={panel} hidden={!expanded} data-kind={state}>
        <p className="cbx__st" aria-hidden="true">
          {status}
        </p>
        <ul
          className="cbx__list"
          id={`${ID}-lista`}
          role="listbox"
          aria-label={s.list}
          hidden={items.length === 0}
          // El foco se queda en el campo al pulsar una opción.
          onPointerDown={(event) => event.preventDefault()}
        >
          {search.run && (
            <search.run.HeroOptions
              items={items}
              query={rankBy}
              active={active}
              onActive={setActive}
              onPick={go}
            />
          )}
        </ul>
      </div>
      <p className="sr-only" role="status" ref={live} />
    </div>
  )
}
