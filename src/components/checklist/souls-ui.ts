// El progreso en la página de una checklist de almas (el Ocre): lee y guarda las almas de
// ta-web:progress (src/lib/checklists/progress/souls.ts) y pinta sobre el HTML del servidor las
// casillas, el porcentaje y lo que se tiene de cada etapa, región y subzona. Elige la vista (por
// etapa o por región) y la etapa o región que se ve (la lista de al lado, anterior y siguiente),
// filtra por tipo, busca en todas las almas, oculta las que se tienen, copia el nombre de un
// alma, y abre la copia de seguridad y el reinicio. Lo elegido va en la dirección
// (souls-nav.ts). Trae una vez «cosecha:done» de silvestre-checklist. Lo carga SoulsIsland con
// import().
//
// React pinta las dos vistas y es dueño de cada nodo: aquí nunca se mueve ninguno, solo se
// ocultan y se escriben textos y atributos. Lo elegido también se guarda en `.sl-win`, en
// atributos que React no pinta, así que al volver a arrancar (la vista previa del panel refresca
// la página) se lee de ahí y todo sigue igual.
import { pendingLegacy } from '@/lib/checklists/progress/legacy-keys'
import {
  migrateSouls,
  resetSouls,
  setSoul,
  soulsDone,
  soulsPct,
} from '@/lib/checklists/progress/souls'
import {
  PROGRESS_KEY,
  readProgress,
  writeProgress,
  type Progress,
} from '@/lib/checklists/progress/store'
import type { SoulsIslandData } from '@/lib/checklists/souls'
import {
  neighbours,
  pickKey,
  readSoulsHash,
  shownKeys,
  soulsHash,
  tallies,
  typeMatches,
  type NavGroup,
  type SoulsBy,
  type SoulsType,
} from '@/lib/checklists/souls-nav'
import { soulMatches, soulQuery } from '@/lib/checklists/souls-search'
import { soulsStrings as o } from '@/lib/checklists/strings'

import {
  closeOnOutsideClick,
  createBackup,
  createToast,
  progressDialog,
  safeStorage,
} from './progress-shared'
import { progressStrings as s } from './progress-strings'

const BYS: readonly SoulsBy[] = ['stage', 'region']
const TYPES: readonly SoulsType[] = ['all', 'boss', 'archi']
const pick = <T extends string>(options: readonly T[], value: string | undefined, fallback: T) =>
  options.find((option) => option === value) ?? fallback

const $$ = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) => [
  ...root.querySelectorAll<T>(selector),
]

/** Lo que tarda un alma en irse con «Ocultar las que tengo» (checklist.css, sl-leave). */
const LEAVE_MS = 240
/** Lo que se queda a la vista un alma recién marcada antes de irse, para ver la marca. */
const LINGER_MS = 650

/** Una vista (por etapa o por región), leída del HTML una vez. */
interface View {
  by: SoulsBy
  root: HTMLElement
  groups: NavGroup[]
  panels: Map<string, HTMLElement>
  items: Map<string, HTMLElement>
  labels: Map<string, string>
}

function readView(by: SoulsBy): View | null {
  const root = document.querySelector<HTMLElement>(`[data-sl-view="${by}"]`)
  if (!root) return null
  const panels = $$('[data-sl-panel]', root)
  return {
    by,
    root,
    groups: panels.map((panel) => ({
      key: panel.dataset.slPanel ?? '',
      souls: $$('.sl-soul', panel).map((row) => ({
        id: Number(row.dataset.soul),
        type: row.dataset.type ?? '',
      })),
    })),
    panels: new Map(panels.map((panel) => [panel.dataset.slPanel ?? '', panel])),
    items: new Map($$('[data-sl-item]', root).map((item) => [item.dataset.slItem ?? '', item])),
    labels: new Map(
      panels.map((panel) => [
        panel.dataset.slPanel ?? '',
        panel.querySelector('.sl-ph__t')?.textContent ?? '',
      ]),
    ),
  }
}

/** Empieza el progreso de la página; devuelve con qué pararlo. */
export function startSouls(data: SoulsIslandData): () => void {
  let progress: Progress = readProgress(safeStorage)
  const win = document.querySelector<HTMLElement>('.sl-win')
  const views = { stage: readView('stage'), region: readView('region') }
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
  // Lo ya elegido (en un arranque anterior); la dirección, si dice algo, gana.
  let by = pick(BYS, win?.dataset.slShown, 'stage')
  let type = pick(TYPES, win?.dataset.slFilter, 'all')
  const at: Record<SoulsBy, string | null> = {
    stage: win?.dataset.slAtStage ?? null,
    region: win?.dataset.slAtRegion ?? null,
  }
  function fromHash() {
    const found = readSoulsHash(window.location.hash)
    if (found.by) by = found.by
    if (found.by && found.at) at[found.by] = found.at
    if (found.type) type = found.type
    return Object.keys(found).length > 0
  }
  const hashed = fromHash()
  const search = document.querySelector<HTMLInputElement>('[data-sl-q]')
  let query = soulQuery(search?.value ?? '')
  let hide = document.querySelector<HTMLInputElement>('[data-sl-hide]')?.checked ?? false
  let warned = false
  /** Almas recién marcadas con «Ocultar las que tengo»: se ven un momento antes de irse. */
  const lingering = new Set<number>()
  const timers = new Set<ReturnType<typeof setTimeout>>()
  const later = (ms: number, run: () => void) => {
    const timer = setTimeout(() => {
      timers.delete(timer)
      run()
    }, ms)
    timers.add(timer)
  }
  const { show: toast, clear: clearToast } = createToast()
  const rows = $$<HTMLLIElement>('.sl-soul')
  const own = (id: number | string) => progress.souls[String(id)] !== undefined
  /** La etapa o región que se ve en cada vista, la del último render(). */
  const shown: Record<SoulsBy, string | null> = { stage: null, region: null }

  function save(next: Progress) {
    if (next === progress) return
    progress = next
    if (!writeProgress(safeStorage, progress) && !warned) {
      warned = true
      toast(s.notSaved)
    }
    render()
  }
  const backup = createBackup({ get: () => progress, save, toast })

  /** Un alma se ve si es del tipo, coincide con la búsqueda y no se oculta por tenerla. */
  function visible(row: HTMLElement) {
    const id = Number(row.dataset.soul)
    const level = row.dataset.level ? Number(row.dataset.level) : null
    return (
      typeMatches(type, row.dataset.type) &&
      soulMatches(query, { search: row.dataset.search ?? '', level }) &&
      !(hide && own(id) && !lingering.has(id))
    )
  }

  /** Lo elegido en la dirección, sin añadir pasos al historial. */
  function writeHash() {
    const hash = soulsHash({ by, at: shown[by], type })
    if (window.location.hash === hash) return
    const url = `${window.location.pathname}${window.location.search}${hash}`
    // Con null, como pide Next: así pasa la dirección a su router y no la pisa al refrescar.
    window.history.replaceState(null, '', url)
  }

  /**
   * Pinta todo sobre el HTML del servidor. `enter` anima el panel que se enseña: desde el lado
   * del que viene (anterior o siguiente) o un fundido (otra vista, otro tipo).
   */
  function render(enter?: 'prev' | 'next' | 'fade') {
    for (const row of rows) {
      const owned = own(row.dataset.soul ?? '')
      const box = row.querySelector<HTMLInputElement>('[data-sl-own]')
      if (box) box.checked = owned
      row.toggleAttribute('data-owned', owned)
      row.hidden = !visible(row)
      if (!row.hidden) row.removeAttribute('data-leave')
    }
    if (win) {
      win.dataset.slShown = by
      win.dataset.slFilter = type
      win.toggleAttribute('data-sl-searching', query !== null)
    }
    for (const button of $$('[data-sl-by]')) {
      button.setAttribute('aria-pressed', String(button.dataset.slBy === by))
    }
    for (const button of $$('[data-sl-type]')) {
      button.setAttribute('aria-pressed', String(button.dataset.slType === type))
    }
    let matches = 0
    for (const view of [views.stage, views.region]) {
      if (!view) continue
      const seen = paintView(view, view.by === by ? enter : undefined)
      if (view.by === by) matches = seen
    }
    if (win) {
      win.dataset.slAtStage = shown.stage ?? ''
      win.dataset.slAtRegion = shown.region ?? ''
    }
    // Buscando, el título de los resultados encima de los paneles de la vista que se ve.
    for (const view of [views.stage, views.region]) {
      const results = view?.root.querySelector<HTMLElement>('[data-sl-results]')
      if (!view || !results) continue
      results.hidden = query === null || view.by !== by
      const title = results.querySelector('[data-sl-rq]')
      const count = results.querySelector('[data-sl-rc]')
      if (title) title.textContent = o.results(search?.value.trim() ?? '')
      if (count) count.textContent = o.souls(matches)
    }
    const pct = soulsPct(progress, data)
    const pctEl = document.querySelector('[data-sl-pct]')
    if (pctEl) pctEl.textContent = s.pct(pct)
    const bar = document.querySelector<HTMLElement>('[data-sl-bar]')
    if (bar) {
      bar.setAttribute('aria-valuenow', String(pct))
      bar.style.setProperty('--ratio', String(pct / 100))
    }
    const done = document.querySelector('[data-sl-done]')
    if (done) done.textContent = String(soulsDone(progress, data))
  }

  /** Una vista: su lista, sus paneles, el vacío y anterior y siguiente. Devuelve cuántas se ven. */
  function paintView(view: View, enter?: 'prev' | 'next' | 'fade'): number {
    const counts = tallies(view.groups, own, type)
    const keys = shownKeys(view.groups, type)
    const current = pickKey(keys, at[view.by])
    const before = shown[view.by]
    shown[view.by] = current
    for (const [key, item] of view.items) {
      item.hidden = !keys.includes(key)
      const button = item.querySelector<HTMLElement>('[data-sl-at]')
      if (!button) continue
      const { owned = 0, total = 0 } = counts.get(key) ?? {}
      if (key === current) button.setAttribute('aria-current', 'true')
      else button.removeAttribute('aria-current')
      button.toggleAttribute('data-complete', total > 0 && owned === total)
      button.style.setProperty('--ratio', String(total ? owned / total : 0))
      const count = button.querySelector('[data-sl-sc]')
      if (count) count.textContent = o.groupCount(owned, total)
    }
    let matches = 0
    for (const [key, panel] of view.panels) {
      const inPanel = $$<HTMLElement>('.sl-soul', panel)
      const seen = inPanel.filter((row) => !row.hidden).length
      matches += seen
      const wasHidden = panel.hidden
      panel.hidden = query !== null ? seen === 0 : key !== current
      const moved = enter === 'fade' || wasHidden || key !== before
      if (!panel.hidden && view.by === by && enter && moved) {
        if (reduce.matches) panel.removeAttribute('data-enter')
        else replay(panel, 'data-enter', enter)
      }
      const { owned = 0, total = 0 } = counts.get(key) ?? {}
      panel.toggleAttribute('data-complete', total > 0 && owned === total)
      if (total === 0 || owned !== total) panel.removeAttribute('data-cheer')
      const sumDone = panel.querySelector('[data-sl-sd]')
      const sumTotal = panel.querySelector('[data-sl-st]')
      if (sumDone) sumDone.textContent = String(owned)
      if (sumTotal) sumTotal.textContent = String(total)
      const ring = panel.querySelector<HTMLElement>('[data-sl-ring]')
      if (ring) {
        ring.style.setProperty('--ratio', String(total ? owned / total : 0))
        const value = ring.querySelector('[data-sl-rv]')
        if (value) value.textContent = s.pct(total ? Math.round((owned / total) * 100) : 0)
      }
      for (const sub of $$('[data-sl-sub]', panel)) {
        const inSub = $$<HTMLElement>('.sl-soul', sub)
        sub.hidden = inSub.every((row) => row.hidden)
        const ofType = inSub.filter((row) => typeMatches(type, row.dataset.type))
        const subOwned = ofType.filter((row) => own(row.dataset.soul ?? '')).length
        sub.toggleAttribute('data-complete', ofType.length > 0 && subOwned === ofType.length)
        const count = sub.querySelector('[data-sl-gc]')
        if (count) count.textContent = o.groupCount(subOwned, ofType.length)
      }
    }
    // Nada que enseñar: buscando, que nada coincide; si no, que ya se tienen todas.
    const empty = view.root.querySelector<HTMLElement>('[data-sl-empty]')
    if (empty) {
      const nothing = query !== null ? matches === 0 : !current || !hasVisible(view, current)
      empty.hidden = !nothing
      if (nothing) {
        empty.textContent =
          query === null && hide && current
            ? view.by === 'stage'
              ? o.stageOwned(current)
              : o.regionOwned
            : o.empty
      }
    }
    const pager = view.root.querySelector<HTMLElement>('[data-sl-pager]')
    if (pager) {
      pager.hidden = query !== null
      const near = neighbours(keys, current)
      for (const button of $$<HTMLButtonElement>('[data-sl-go]', pager)) {
        const target = button.dataset.slGo === 'prev' ? near.prev : near.next
        button.hidden = target === null
        button.dataset.slTarget = target ?? ''
        const label = button.querySelector('[data-sl-gl]')
        if (label) label.textContent = target === null ? '' : (view.labels.get(target) ?? '')
      }
    }
    return query !== null ? matches : current ? countVisible(view, current) : 0
  }

  const countVisible = (view: View, key: string) =>
    $$('.sl-soul:not([hidden])', view.panels.get(key) ?? document.createElement('div')).length
  const hasVisible = (view: View, key: string) => countVisible(view, key) > 0

  /** Cuántas se ven, para los lectores de pantalla: solo cuando cambia lo que se ve, no al marcar. */
  function announce() {
    const view = views[by]
    const status = document.querySelector('[data-sl-status]')
    if (!status || !view) return
    const current = shown[by]
    const count =
      query !== null
        ? $$('[data-sl-panel] .sl-soul:not([hidden])', view.root).length
        : current
          ? countVisible(view, current)
          : 0
    status.textContent = o.souls(count)
  }

  /** Cambió lo que se ve (la vista, el tipo, el buscador u ocultar): se pinta y se anuncia. */
  function refilter(enter?: 'prev' | 'next' | 'fade') {
    render(enter)
    announce()
  }

  /** Ir a otra etapa o región: se pinta desde su lado, se apunta y se deja a la vista. */
  function go(key: string, focus: boolean) {
    const view = views[by]
    if (!view) return
    const keys = shownKeys(view.groups, type)
    const from = keys.indexOf(shown[by] ?? '')
    const to = keys.indexOf(key)
    at[by] = key
    if (query !== null && search) {
      search.value = ''
      query = null
    }
    refilter(to < from ? 'prev' : 'next')
    writeHash()
    keepInView(view, focus)
  }

  /**
   * La etapa elegida a la vista: si su principio quedaba debajo de la cabecera fija o más arriba,
   * se vuelve a las herramientas (scroll-margin-top en checklist.css). En el móvil, el botón
   * elegido se desliza dentro de su fila. Con `focus`, el foco va a su título (anterior y
   * siguiente pueden desaparecer al llegar a un extremo).
   */
  function keepInView(view: View, focus: boolean) {
    const current = shown[by]
    const panel = current ? view.panels.get(current) : undefined
    const tools = document.querySelector<HTMLElement>('.sl-tools')
    const header = document.querySelector('.site-hdr')?.getBoundingClientRect().bottom ?? 0
    const behavior: ScrollBehavior = reduce.matches ? 'auto' : 'smooth'
    if (panel && tools && panel.getBoundingClientRect().top < header) {
      tools.scrollIntoView({ block: 'start', behavior })
    }
    if (focus) panel?.querySelector<HTMLElement>('.sl-ph__t')?.focus({ preventScroll: true })
    scrollChip(view, behavior)
  }

  function scrollChip(view: View, behavior: ScrollBehavior) {
    const list = view.root.querySelector<HTMLElement>('.sl-nav__l')
    const button = list?.querySelector<HTMLElement>('[aria-current]')
    if (!list || !button || getComputedStyle(list).overflowX !== 'auto') return
    const left = button.offsetLeft - (list.clientWidth - button.offsetWidth) / 2
    list.scrollTo({ left: Math.max(0, left), behavior })
  }

  // ---------- marcar se nota (checklist.css anima; nada se mueve sin animaciones) ----------

  /** Las etapas con todas sus almas (de cualquier tipo), y «all» si se tienen todas. */
  function completeStages() {
    const counts = tallies(views.stage?.groups ?? [], own, 'all')
    const complete = new Set(
      [...counts].filter(([, c]) => c.total > 0 && c.owned === c.total).map(([key]) => key),
    )
    if (data.souls.length > 0 && data.souls.every(own)) complete.add('all')
    return complete
  }

  /** Vuelve a poner un atributo para que su animación empiece otra vez. */
  function replay(el: HTMLElement, name: string, value = '') {
    el.removeAttribute(name)
    void el.offsetWidth
    el.setAttribute(name, value)
  }

  /** Si se ve: sin nada oculto por encima y en la vista elegida. */
  const isShown = (el: HTMLElement) =>
    !el.closest('[hidden]') &&
    (el.closest<HTMLElement>('[data-sl-view]')?.dataset.slView ?? by) === by

  /**
   * Anima lo que se ve con un atributo; lo que no se ve no correría su animación y el atributo se
   * quedaría puesto hasta que se viera (al cambiar de vista, todo destellaría a la vez): se quita.
   */
  function animate(el: HTMLElement, name: string, value = '') {
    if (isShown(el) && !reduce.matches) replay(el, name, value)
    else el.removeAttribute(name)
  }

  /** Las almas que se van con «Ocultar las que tengo»: se encogen y, después, se ocultan. */
  function leave(targets: HTMLElement[], then: () => void) {
    const going = targets.filter((row) => isShown(row))
    if (!going.length || reduce.matches) return then()
    for (const row of going) row.setAttribute('data-leave', '')
    later(LEAVE_MS, then)
  }

  /**
   * Marcar o desmarcar un alma: se anima la copia que se ve y se celebra la etapa que se completa,
   * con el alma que la completa (es donde se mira). Con «Ocultar las que tengo», se queda un
   * momento y se va.
   */
  function mark(id: number, on: boolean) {
    const before = completeStages()
    if (on && hide) lingering.add(id)
    save(setSoul(progress, id, on, Date.now()))
    const fresh = [...completeStages()].filter((key) => !before.has(key))
    const copies = $$(`.sl-soul[data-soul="${id}"]`)
    for (const row of copies) {
      animate(row, 'data-just', on ? 'on' : 'off')
      if (fresh.length) animate(row, 'data-cheer')
    }
    for (const key of fresh) {
      const panel = views.stage?.panels.get(key)
      const item = views.stage?.items.get(key)?.querySelector<HTMLElement>('[data-sl-at]')
      if (panel) animate(panel, 'data-cheer')
      if (item) animate(item, 'data-cheer')
    }
    if (fresh.includes('all')) toast(o.allComplete)
    else if (fresh.length) toast(o.stageComplete(fresh[0]))
    if (on && hide) {
      later(reduce.matches ? 0 : LINGER_MS, () =>
        leave(copies, () => {
          lingering.delete(id)
          render()
          announce()
        }),
      )
    }
  }

  // Cada atributo mueve varias animaciones de distinta duración (la casilla y el destello, el
  // número y las chispas): se quita cuando no queda ninguna en marcha, también si se corta.
  const FAMILIES = [
    ['sl-just', 'data-just'],
    ['sl-cheer', 'data-cheer'],
    ['sl-enter', 'data-enter'],
  ] as const
  function onAnimationDone(event: AnimationEvent) {
    const family = FAMILIES.find(([prefix]) => event.animationName.startsWith(prefix))
    const target = event.target instanceof Element ? event.target : null
    if (!family || !target) return
    const [prefix, name] = family
    // El alma que completa la etapa está dentro de la etapa, que también celebra: se miran todos
    // los que llevan el atributo hacia arriba, no solo el más cercano.
    for (
      let host = target.closest<HTMLElement>(`[${name}]`);
      host;
      host = host.parentElement?.closest<HTMLElement>(`[${name}]`) ?? null
    ) {
      const still = (host.getAnimations?.({ subtree: true }) ?? []).some(
        (animation) =>
          animation.playState === 'running' &&
          ((animation as CSSAnimation).animationName ?? '').startsWith(prefix),
      )
      if (!still) host.removeAttribute(name)
    }
  }

  // ---------- copiar el nombre ----------
  async function copy(button: HTMLElement) {
    const name = button.dataset.slCopy ?? ''
    try {
      await navigator.clipboard.writeText(name)
      toast(o.copied(name))
      replay(button, 'data-copied')
      later(1400, () => button.removeAttribute('data-copied'))
    } catch {
      toast(o.copyFailed(name))
    }
  }

  // ---------- el menú «⋯», la copia y el reinicio ----------
  const menuButton = document.querySelector<HTMLElement>('[data-ck-more]')
  const menu = document.querySelector<HTMLElement>('#ck-more')
  const setMenu = (open: boolean) => {
    menuButton?.setAttribute('aria-expanded', String(open))
    if (menu) menu.hidden = !open
  }

  function openReset() {
    const count = document.querySelector('[data-ck-reset-count="souls"]')
    if (count) count.textContent = s.resetCount(soulsDone(progress, data))
    const reset = progressDialog('reset')
    if (!reset) return
    // Sin esto, cerrar con Escape o fuera del diálogo dejaría el «reset» de la vez anterior.
    reset.returnValue = ''
    reset.showModal()
  }

  function onResetClose(this: HTMLDialogElement) {
    if (this.returnValue !== 'reset') return
    const chosen = document.querySelector<HTMLInputElement>('[data-ck-reset="souls"]')?.checked
    if (!chosen) return
    save(resetSouls(progress, data))
    toast(s.resetDone)
  }

  function onClick(event: MouseEvent) {
    const target = event.target instanceof Element ? event.target : null
    if (!target) return
    if (!target.closest('.ck-tools')) setMenu(false)
    const byButton = target.closest<HTMLElement>('[data-sl-by]')
    if (byButton) {
      const next = pick(BYS, byButton.dataset.slBy, by)
      if (next === by) return
      by = next
      refilter('fade')
      writeHash()
      const view = views[by]
      if (view) scrollChip(view, 'auto')
      return
    }
    const atButton = target.closest<HTMLElement>('[data-sl-at]')
    if (atButton) return go(atButton.dataset.slAt ?? '', false)
    const goButton = target.closest<HTMLElement>('[data-sl-go]')
    if (goButton?.dataset.slTarget) return go(goButton.dataset.slTarget, true)
    const typeButton = target.closest<HTMLElement>('[data-sl-type]')
    if (typeButton) {
      const next = pick(TYPES, typeButton.dataset.slType, type)
      if (next === type) return
      type = next
      refilter('fade')
      return writeHash()
    }
    const copyButton = target.closest<HTMLElement>('[data-sl-copy]')
    if (copyButton) return void copy(copyButton)
    if (target.closest('[data-ck-more]')) return setMenu(menu?.hidden ?? false)
    const tool = target.closest<HTMLElement>('[data-ck-tool]')
    if (tool) {
      setMenu(false)
      if (tool.dataset.ckTool === 'reset') return openReset()
      backup.state()
      return progressDialog('backup')?.showModal()
    }
    if (target.closest('[data-ck-dialog-close]')) return target.closest('dialog')?.close()
    if (target.closest('[data-ck-download]')) return backup.download()
    closeOnOutsideClick(target, event)
  }

  function onChange(event: Event) {
    const box = event.target instanceof HTMLInputElement ? event.target : null
    if (!box) return
    if (box.dataset.slOwn) return mark(Number(box.dataset.slOwn), box.checked)
    if (box.hasAttribute('data-sl-hide')) {
      hide = box.checked
      if (!hide) return refilter()
      // Las que se tienen se van juntas y después el panel cierra los huecos.
      return leave(
        rows.filter((row) => row.hasAttribute('data-owned')),
        () => refilter(),
      )
    }
    if (box.hasAttribute('data-ck-restore') && box.files?.[0]) {
      void backup.restore(box.files[0])
      box.value = ''
    }
  }

  function onInput(event: Event) {
    const input = event.target instanceof HTMLInputElement ? event.target : null
    if (!input?.hasAttribute('data-sl-q')) return
    const before = query
    query = soulQuery(input.value)
    // Al dejar de buscar vuelve la etapa elegida, con su fundido.
    refilter(before !== null && query === null ? 'fade' : undefined)
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && menu && !menu.hidden) {
      setMenu(false)
      menuButton?.focus()
    }
  }

  // Lo que guarda otra pestaña (otra checklist) llega sin recargar.
  function onStorage(event: StorageEvent) {
    if (event.key !== PROGRESS_KEY && event.key !== null) return
    progress = readProgress(safeStorage)
    render()
  }

  // Una dirección escrita a mano o un enlace a otra etapa en la misma página.
  function onHashChange() {
    if (!fromHash()) return
    refilter('fade')
    // El router de Next no ve un cambio de la dirección hecho a mano: se le pasa, o al refrescar
    // la página (la vista previa del panel) volvería a la dirección sin lo elegido.
    writeHash()
  }

  // El servidor pinta las casillas y botones desactivados: ya está aquí el código que los atiende.
  for (const control of $$<HTMLInputElement | HTMLButtonElement>('[data-ck-wait]')) {
    control.disabled = false
  }
  const resetDialog = progressDialog('reset')
  document.addEventListener('click', onClick)
  document.addEventListener('change', onChange)
  document.addEventListener('input', onInput)
  document.addEventListener('keydown', onKeyDown)
  window.addEventListener('storage', onStorage)
  window.addEventListener('hashchange', onHashChange)
  document.addEventListener('animationend', onAnimationDone)
  document.addEventListener('animationcancel', onAnimationDone)
  resetDialog?.addEventListener('close', onResetClose)
  render()
  // Un enlace con lo elegido: su dirección pasa también al router de Next (onHashChange).
  if (hashed) writeHash()
  const startView = views[by]
  if (startView) scrollChip(startView, 'auto')
  migrateLegacy()

  /** «cosecha:done» de silvestre-checklist, una vez: solo si está y no se ha traído. */
  function migrateLegacy() {
    let keys: string[] = []
    try {
      keys = Object.keys(window.localStorage)
    } catch {
      return
    }
    const own = data.legacy?.prefix?.replace(/:$/, '') ?? null
    if (!pendingLegacy(keys, own, progress.migrated)) return
    const next = migrateSouls(readProgress(safeStorage), {
      keys,
      read: (key) => safeStorage.getItem(key),
      now: Date.now(),
    })
    if (writeProgress(safeStorage, next)) {
      progress = next
      render()
    }
  }

  return () => {
    clearToast()
    for (const timer of timers) clearTimeout(timer)
    document.removeEventListener('click', onClick)
    document.removeEventListener('change', onChange)
    document.removeEventListener('input', onInput)
    document.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('storage', onStorage)
    window.removeEventListener('hashchange', onHashChange)
    document.removeEventListener('animationend', onAnimationDone)
    document.removeEventListener('animationcancel', onAnimationDone)
    resetDialog?.removeEventListener('close', onResetClose)
  }
}
