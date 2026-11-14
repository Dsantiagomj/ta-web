// El progreso en la página de una checklist de almas (el Ocre): lee y guarda las almas de
// ta-web:progress (src/lib/checklists/progress/souls.ts) y pinta sobre el HTML del servidor las
// casillas, el porcentaje y lo que cuenta cada grupo; elige la vista (por etapa o por región),
// filtra por tipo, busca, oculta las que se tienen, y abre la copia de seguridad y el reinicio.
// Trae una vez «cosecha:done» de silvestre-checklist. Lo carga SoulsIsland con import().
//
// React pinta las dos vistas y es dueño de cada nodo: aquí nunca se mueve ninguno. Lo elegido
// (vista y tipo) se guarda en `.sl-win`, en atributos que React no pinta, así que al volver a
// arrancar (la vista previa del panel refresca la página) se lee de ahí y todo sigue igual.
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

type By = 'stage' | 'region'
type Type = 'all' | 'boss' | 'archi'

const BYS: readonly By[] = ['stage', 'region']
const TYPES: readonly Type[] = ['all', 'boss', 'archi']
const pick = <T extends string>(options: readonly T[], value: string | undefined, fallback: T) =>
  options.find((option) => option === value) ?? fallback

const $$ = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) => [
  ...root.querySelectorAll<T>(selector),
]

/** Empieza el progreso de la página; devuelve con qué pararlo. */
export function startSouls(data: SoulsIslandData): () => void {
  let progress: Progress = readProgress(safeStorage)
  const win = document.querySelector<HTMLElement>('.sl-win')
  // Lo ya elegido (en un arranque anterior) o escrito antes de que llegara este código.
  let by = pick(BYS, win?.dataset.slShown, 'stage')
  let type = pick(TYPES, win?.dataset.slFilter, 'all')
  const stageKeys = $$('[data-sl-stage]').map((button) => button.dataset.slStage ?? 'all')
  let stage = pick(stageKeys, win?.dataset.slAt, 'all')
  let query = soulQuery(document.querySelector<HTMLInputElement>('[data-sl-q]')?.value ?? '')
  let hide = document.querySelector<HTMLInputElement>('[data-sl-hide]')?.checked ?? false
  let warned = false
  const { show: toast, clear: clearToast } = createToast()
  const rows = $$<HTMLLIElement>('.sl-soul')
  const shownView = () => document.querySelector<HTMLElement>(`[data-sl-view="${by}"]`)
  // Lo que se tiene de cada etapa (y de todas, «all»), contado en render(): de ahí salen el
  // panel, las etapas completas y lo que se celebra al marcar.
  let tally = new Map<string, { owned: number; total: number }>()
  /** Si se ve: sin nada oculto por encima y en la vista elegida. */
  const isShown = (el: HTMLElement) =>
    !el.closest('[hidden]') &&
    (el.closest<HTMLElement>('[data-sl-view]')?.dataset.slView ?? by) === by

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

  /**
   * La vista, el tipo y la etapa elegidos: en `.sl-win` (checklist.css enseña la vista) y en los
   * botones.
   */
  function choose() {
    if (win) {
      win.dataset.slShown = by
      win.dataset.slFilter = type
      win.dataset.slAt = stage
    }
    for (const button of $$('[data-sl-stage]')) {
      button.setAttribute('aria-pressed', String(button.dataset.slStage === stage))
    }
    for (const button of $$('[data-sl-by]')) {
      button.setAttribute('aria-pressed', String(button.dataset.slBy === by))
    }
    for (const button of $$('[data-sl-type]')) {
      button.setAttribute('aria-pressed', String(button.dataset.slType === type))
    }
  }

  /** Las almas que se ven en la vista elegida. */
  const shown = () => {
    const view = shownView()
    return view ? $$('[data-sl-group]:not([hidden]) .sl-soul:not([hidden])', view).length : 0
  }

  /** Cuántas se ven, para los lectores de pantalla: solo cuando cambia lo que se ve, no al marcar. */
  function announce() {
    const status = document.querySelector('[data-sl-status]')
    if (status) status.textContent = o.souls(shown())
  }

  // Las dos vistas a la vez: al cambiar de una a otra ya está todo al día.
  function render() {
    const own = (row: HTMLElement) => progress.souls[row.dataset.soul ?? ''] !== undefined
    for (const row of rows) {
      const owned = own(row)
      const box = row.querySelector<HTMLInputElement>('[data-sl-own]')
      if (box) box.checked = owned
      row.toggleAttribute('data-owned', owned)
      const level = row.dataset.level ? Number(row.dataset.level) : null
      row.hidden = !(
        (type === 'all' || row.dataset.type === type) &&
        soulMatches(query, { search: row.dataset.search ?? '', level }) &&
        !(hide && owned)
      )
    }
    const stageView = document.querySelector<HTMLElement>('[data-sl-view="stage"]')
    const counts = new Map<string, { owned: number; total: number }>()
    const all = { owned: 0, total: 0 }
    for (const group of $$('[data-sl-group]')) {
      const inGroup = $$<HTMLElement>('.sl-soul', group)
      const owned = inGroup.filter(own).length
      const byStage = Boolean(stageView?.contains(group))
      // La etapa elegida en el panel solo filtra la vista por etapa.
      const otherStage = stage !== 'all' && group.dataset.slGroup !== stage && byStage
      group.hidden = otherStage || inGroup.every((row) => row.hidden)
      const count = group.querySelector('[data-sl-gc]')
      if (count) count.textContent = o.groupCount(owned, inGroup.length)
      if (byStage) {
        counts.set(group.dataset.slGroup ?? '', { owned, total: inGroup.length })
        all.owned += owned
        all.total += inGroup.length
      }
    }
    tally = counts.set('all', all)
    // El panel de las etapas: lo que se tiene de cada una, sin contar los filtros.
    for (const button of $$('[data-sl-stage]')) {
      const { owned = 0, total = 0 } = tally.get(button.dataset.slStage ?? '') ?? {}
      const count = button.querySelector('[data-sl-sc]')
      if (count) count.textContent = o.groupCount(owned, total)
    }
    // Una etapa con todas sus almas se ve completa, en su título y en el panel.
    const complete = completeStages()
    for (const el of stageMarks()) {
      const key = el.dataset.slGroup ?? el.dataset.slStage ?? ''
      el.toggleAttribute('data-complete', complete.has(key))
      if (!complete.has(key)) el.removeAttribute('data-cheer')
    }
    // Sin almas que enseñar: sin búsqueda y con «Ocultar las que tengo», es que ya se tienen.
    const empty = document.querySelector<HTMLElement>('[data-sl-empty]')
    if (empty) {
      empty.hidden = shown() > 0
      if (!empty.hidden) {
        const owned = !query && hide
        empty.textContent = !owned
          ? o.empty
          : by === 'stage' && stage !== 'all'
            ? o.stageOwned(stage)
            : o.allOwned
      }
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

  /** Cambió lo que se ve (la vista, el tipo, el buscador u ocultar): se pinta y se anuncia. */
  function refilter() {
    render()
    announce()
  }

  // ---------- marcar se nota (checklist.css anima; nada se mueve sin animaciones) ----------

  /** Los títulos de las etapas y los botones del panel, que dicen si la etapa está completa. */
  const stageMarks = () => [
    ...$$('[data-sl-view="stage"] [data-sl-group]'),
    ...$$('[data-sl-stage]'),
  ]

  /** Las etapas con todas sus almas, y «all» si se tienen todas: del último render(). */
  const completeStages = () =>
    new Set(
      [...tally].filter(([, { owned, total }]) => total > 0 && owned === total).map(([key]) => key),
    )

  /** Vuelve a poner un atributo para que su animación empiece otra vez. */
  function replay(el: HTMLElement, name: string, value = '') {
    el.removeAttribute(name)
    void el.offsetWidth
    el.setAttribute(name, value)
  }

  /**
   * Anima lo que se ve con un atributo; lo que no se ve no correría su animación y el atributo se
   * quedaría puesto hasta que se viera (al cambiar de vista, todo destellaría a la vez): se quita.
   */
  function animate(el: HTMLElement, name: string, value = '') {
    if (isShown(el)) replay(el, name, value)
    else el.removeAttribute(name)
  }

  /**
   * Marcar o desmarcar un alma: se anima la copia que se ve y se celebra la etapa que se completa,
   * con el alma que la completa (es donde se mira; el título puede quedar fuera de la vista).
   */
  function mark(id: number, on: boolean) {
    const before = completeStages()
    save(setSoul(progress, id, on, Date.now()))
    const fresh = [...completeStages()].filter((key) => !before.has(key))
    for (const row of $$(`.sl-soul[data-soul="${id}"]`)) {
      animate(row, 'data-just', on ? 'on' : 'off')
      if (fresh.length) animate(row, 'data-cheer')
    }
    for (const el of stageMarks()) {
      if (fresh.includes(el.dataset.slGroup ?? el.dataset.slStage ?? '')) animate(el, 'data-cheer')
    }
    if (fresh.includes('all')) toast(o.allComplete)
    else if (fresh.length) toast(o.stageComplete(fresh[0]))
  }

  // Cada atributo mueve varias animaciones de distinta duración (la casilla y el destello, el
  // número y las chispas): se quita cuando no queda ninguna en marcha, también si se corta.
  const FAMILIES = [
    ['sl-just', 'data-just'],
    ['sl-cheer', 'data-cheer'],
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
      by = pick(BYS, byButton.dataset.slBy, by)
      choose()
      return refilter()
    }
    const stageButton = target.closest<HTMLElement>('[data-sl-stage]')
    if (stageButton) {
      stage = pick(stageKeys, stageButton.dataset.slStage, 'all')
      choose()
      refilter()
      // Si el principio de la lista quedaba debajo de la cabecera fija o más arriba, se vuelve a
      // las herramientas, que quedan bajo la cabecera (scroll-margin-top en checklist.css).
      const list = document.querySelector<HTMLElement>('.sl-staged__list')
      const tools = document.querySelector<HTMLElement>('.sl-tools')
      const header = document.querySelector('.site-hdr')?.getBoundingClientRect().bottom ?? 0
      if (list && tools && list.getBoundingClientRect().top < header) {
        tools.scrollIntoView({ block: 'start' })
      }
      return
    }
    const typeButton = target.closest<HTMLElement>('[data-sl-type]')
    if (typeButton) {
      type = pick(TYPES, typeButton.dataset.slType, type)
      choose()
      return refilter()
    }
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
      return refilter()
    }
    if (box.hasAttribute('data-ck-restore') && box.files?.[0]) {
      void backup.restore(box.files[0])
      box.value = ''
    }
  }

  function onInput(event: Event) {
    const input = event.target instanceof HTMLInputElement ? event.target : null
    if (!input?.hasAttribute('data-sl-q')) return
    query = soulQuery(input.value)
    refilter()
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
  document.addEventListener('animationend', onAnimationDone)
  document.addEventListener('animationcancel', onAnimationDone)
  resetDialog?.addEventListener('close', onResetClose)
  choose()
  render()
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
    document.removeEventListener('click', onClick)
    document.removeEventListener('change', onChange)
    document.removeEventListener('input', onInput)
    document.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('storage', onStorage)
    document.removeEventListener('animationend', onAnimationDone)
    document.removeEventListener('animationcancel', onAnimationDone)
    resetDialog?.removeEventListener('close', onResetClose)
  }
}
