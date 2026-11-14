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
import { soulsStrings as o } from '@/lib/checklists/strings'
import { fold } from '@/lib/text/fold'

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
  let query = fold(document.querySelector<HTMLInputElement>('[data-sl-q]')?.value.trim() ?? '')
  let hide = document.querySelector<HTMLInputElement>('[data-sl-hide]')?.checked ?? false
  let warned = false
  const { show: toast, clear: clearToast } = createToast()
  const rows = $$<HTMLLIElement>('.sl-soul')
  const shownView = () => document.querySelector<HTMLElement>(`[data-sl-view="${by}"]`)

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

  /** La vista y el tipo elegidos: en `.sl-win` (checklist.css enseña la vista) y en los botones. */
  function choose() {
    if (win) {
      win.dataset.slShown = by
      win.dataset.slFilter = type
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
    return view ? $$('.sl-soul:not([hidden])', view).length : 0
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
      row.hidden = !(
        (type === 'all' || row.dataset.type === type) &&
        (!query || (row.dataset.search ?? '').includes(query)) &&
        !(hide && owned)
      )
    }
    for (const group of $$('[data-sl-group]')) {
      const inGroup = $$<HTMLElement>('.sl-soul', group)
      group.hidden = inGroup.every((row) => row.hidden)
      const count = group.querySelector('[data-sl-gc]')
      if (count) count.textContent = o.groupCount(inGroup.filter(own).length, inGroup.length)
    }
    const empty = document.querySelector<HTMLElement>('[data-sl-empty]')
    if (empty) empty.hidden = shown() > 0
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
    if (box.dataset.slOwn)
      return save(setSoul(progress, Number(box.dataset.slOwn), box.checked, Date.now()))
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
    query = fold(input.value.trim())
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
    resetDialog?.removeEventListener('close', onResetClose)
  }
}
