'use client'

import { useEffect } from 'react'

import { checklistDetailsUrl, type ChecklistDetails } from '@/lib/checklists/details-url'
import type { ChecklistIslandData } from '@/lib/checklists/page'

import { checklistIslandStrings as s } from './island-strings'

// La chincheta de CoordinatesChip (src/components/game/icons.tsx), como texto: la isla pinta
// los chips de coordenadas que llegan con los detalles.
const PIN =
  '<svg viewBox="0 0 16 16" aria-hidden="true" class="size-4"><path fill="currentColor" d="M8 1.2a5 5 0 0 0-5 5c0 3.6 5 8.6 5 8.6s5-5 5-8.6a5 5 0 0 0-5-5zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/></svg>'

/** Un chip de coordenadas como el de las guías; la isla de las guías lo copia al pulsarlo. */
function chip(x: number | null, y: number | null): string {
  if (x == null || y == null) return ''
  const label = `[${x},${y}]`
  const command = `/travel ${x},${y}`
  return `<span class="coord" role="button" tabindex="0" data-copy="${command}" aria-label="${s.copyCoordinates(label, command)}">${PIN}${label}</span>`
}

const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

/** Pinta lo que traen los detalles: quién da cada misión, dónde, y dónde está cada objetivo. */
function fillDetails(details: ChecklistDetails) {
  for (const row of document.querySelectorAll<HTMLElement>('.ck-q[data-q]')) {
    const quest = details.q[Number(row.dataset.q)]
    if (!quest) continue
    const [npc, x, y, objectives] = quest
    const name = row.querySelector('[data-ck-npc]')
    if (name && npc) name.textContent = npc
    const start = row.querySelector('[data-ck-start]')
    if (start) start.innerHTML = chip(x, y)
    // Un objetivo en el mismo mapa que el anterior no repite el chip.
    let previous = `${x},${y}`
    for (const slot of row.querySelectorAll<HTMLElement>('[data-ck-coord]')) {
      const objective = objectives[Number(slot.dataset.ckCoord)]
      if (!objective) continue
      const here = `${objective[2]},${objective[3]}`
      slot.innerHTML = here === previous ? '' : chip(objective[2], objective[3])
      if (objective[2] != null) previous = here
    }
  }
}

/**
 * La isla de la página de una checklist (prototipo A). Recibe solo la estructura de la
 * checklist (plan, sección 3); todo lo demás ya está en el HTML. Cambia de pestaña, abre el
 * paso elegido al lado de la lista (en el móvil, en una hoja abajo), busca pasos por número o
 * texto y, después de pintar, pide los detalles: quién da cada misión y las coordenadas.
 * Sin ella, las pestañas y los pasos son enlaces y todo se ve, una parte detrás de otra.
 * El progreso (marcar pasos, misiones y objetos) llega en el PR 5.
 */
export function ChecklistIsland({ data }: { data: ChecklistIslandData }) {
  // Sincroniza con el DOM del servidor, el <dialog>, matchMedia y la API de detalles.
  useEffect(() => {
    const $ = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) =>
      root.querySelector<T & Element>(selector)
    const $$ = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) => [
      ...root.querySelectorAll<T & Element>(selector),
    ]
    const wide = window.matchMedia('(min-width: 64rem)')
    const pane = $('[data-ck-pane]')
    const sheet = $<HTMLDialogElement>('[data-ck-sheet]')
    const list = $('.ck-list')
    const search = $<HTMLInputElement>('[data-ck-q]')
    const status = $('[data-ck-status]')
    const empty = $('[data-ck-empty]')
    if (!pane || !sheet || !list) return
    let current = 0
    let tab = 'diario'

    // Las pestañas: los enlaces pasan a ser pestañas y cada parte su panel.
    const tabs = $$<HTMLAnchorElement>('[data-tab]')
    $('[data-ck-tabs]')?.setAttribute('role', 'tablist')
    for (const link of tabs) {
      const panel = $(`#ck-p-${link.dataset.tab}`)
      link.id = `ck-t-${link.dataset.tab}`
      link.setAttribute('role', 'tab')
      link.setAttribute('aria-controls', `ck-p-${link.dataset.tab}`)
      panel?.setAttribute('role', 'tabpanel')
      panel?.setAttribute('aria-labelledby', link.id)
    }
    const selectTab = (name: string, focus = false) => {
      tab = name
      for (const link of tabs) {
        const on = link.dataset.tab === name
        link.setAttribute('aria-selected', String(on))
        link.tabIndex = on ? 0 : -1
        if (on && focus) link.focus()
      }
      for (const panel of $$('[data-panel]')) {
        panel.toggleAttribute('data-active', panel.dataset.panel === name)
      }
      search?.closest('label')?.toggleAttribute('hidden', name !== 'diario')
    }
    selectTab('diario')

    const article = (n: number) => $(`#paso-${n}`)
    /** Devuelve a su sitio en el panel el paso que estaba en la hoja. */
    const restore = () => {
      for (const step of $$('.ck-step', sheet)) {
        pane.insertBefore(step, $(`[data-step="${Number(step.dataset.step) + 1}"]`, pane))
      }
    }
    const pick = (n: number, { reveal = false, sheetOk = true } = {}) => {
      const step = article(n)
      if (!step) return
      if (tab !== 'diario') selectTab('diario')
      current = n
      for (const row of $$('.ck-row')) {
        row.setAttribute('aria-current', String(Number(row.dataset.n) === n))
      }
      for (const other of $$('.ck-step')) other.toggleAttribute('data-open', other === step)
      if (wide.matches) {
        if (sheet.open) sheet.close()
        restore()
      } else if (sheetOk) {
        restore()
        sheet.append(step)
        sheet.setAttribute('aria-label', s.step(n))
        if (!sheet.open) sheet.showModal()
      }
      const scroll = $('.ck-step__scroll', step)
      if (scroll) scroll.scrollTop = 0
      history.replaceState(null, '', `#paso-${n}`)
      const row = $(`.ck-row[data-n="${n}"]`)
      if (reveal && row && wide.matches) {
        const top = row.offsetTop - list.offsetTop - list.clientHeight / 3
        list.scrollTo({ top, behavior: 'smooth' })
      }
    }

    let timer: ReturnType<typeof setTimeout> | undefined
    const filter = () => {
      const query = search?.value.trim() ?? ''
      const words = fold(query).split(/\s+/).filter(Boolean)
      let shown = 0
      for (const row of $$('.ck-row')) {
        const n = Number(row.dataset.n)
        const text = row.dataset.search ?? ''
        const match = words.every((word) =>
          /^\d+$/.test(word) ? n === Number(word) : text.includes(word),
        )
        row.hidden = !match
        if (match) shown++
      }
      if (empty) {
        empty.hidden = shown > 0
        empty.textContent = shown ? '' : s.searchEmpty(query)
      }
      if (status) status.textContent = query ? s.searchFound(shown) : ''
    }
    const onInput = () => {
      clearTimeout(timer)
      timer = setTimeout(filter, 140)
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null
      if (!target) return
      if (target === sheet || target.closest('[data-ck-close]')) {
        sheet.close()
        return
      }
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const tabLink = target.closest<HTMLElement>('[data-tab]')
      if (tabLink) {
        event.preventDefault()
        selectTab(tabLink.dataset.tab ?? 'diario')
        return
      }
      const picker = target.closest<HTMLElement>('[data-pick]')
      if (picker) {
        event.preventDefault()
        pick(Number(picker.dataset.pick), { reveal: true })
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null
      const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1
      if (target?.closest('[data-ck-tabs]') && /^Arrow(Left|Right)$/.test(event.key)) {
        event.preventDefault()
        const names = tabs.map((link) => link.dataset.tab ?? '')
        const at = names.indexOf(tab)
        selectTab(names[(at + step + names.length) % names.length], true)
        return
      }
      if (target?.closest('.ck-rows') && /^Arrow(Up|Down)$/.test(event.key) && current) {
        event.preventDefault()
        const visible = $$('.ck-row:not([hidden])').map((row) => Number(row.dataset.n))
        const next = visible[visible.indexOf(current) + step]
        if (next) {
          pick(next, { reveal: true, sheetOk: false })
          $<HTMLAnchorElement>(`.ck-row[data-n="${next}"] a`)?.focus()
        }
      }
    }

    // Al cerrar la hoja, el foco vuelve al paso de la lista.
    const onClose = () => $<HTMLAnchorElement>(`.ck-row[data-n="${current}"] a`)?.focus()
    // La ventana pasa de móvil a escritorio o al revés con un paso abierto.
    const onWide = () => current && pick(current, { sheetOk: false })

    const fromHash = Number(/^#paso-(\d+)$/.exec(location.hash)?.[1])
    if (fromHash && article(fromHash)) pick(fromHash, { reveal: true })
    else if (wide.matches) pick(1)

    // Los detalles, una vez por página, después de pintarla.
    const controller = new AbortController()
    fetch(checklistDetailsUrl(data.slug), { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status))
        return response.json() as Promise<ChecklistDetails>
      })
      .then(fillDetails)
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (status) status.textContent = s.loadFailed
        console.error(error)
      })

    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKeyDown)
    search?.addEventListener('input', onInput)
    sheet.addEventListener('close', onClose)
    wide.addEventListener('change', onWide)
    return () => {
      controller.abort()
      clearTimeout(timer)
      document.removeEventListener('click', onClick)
      document.removeEventListener('keydown', onKeyDown)
      search?.removeEventListener('input', onInput)
      sheet.removeEventListener('close', onClose)
      wide.removeEventListener('change', onWide)
    }
  }, [data.slug])

  return null
}
