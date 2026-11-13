// El progreso en la página de una checklist: lee y guarda ta-web:progress (con el motor de
// src/lib/checklists/progress/) y pinta lo marcado sobre el HTML del servidor: las casillas de
// los pasos, las misiones, los prerrequisitos y los objetos, la franja con el porcentaje, los
// filtros Pendientes y Hechos, la copia de seguridad y el reinicio. Lo usa ChecklistIsland.
import {
  checklistModel,
  nextPending,
  progressPct,
  questState,
  resetChecklist,
  setOwned,
  setPrereq,
  setQuest,
  setStep,
  stepDone,
  stepsDone,
  type QuestState,
} from '@/lib/checklists/progress/engine'
import {
  parseProgress,
  PROGRESS_KEY,
  readProgress,
  writeProgress,
  type Progress,
  type ProgressStorage,
} from '@/lib/checklists/progress/store'
import type { ChecklistIslandData } from '@/lib/checklists/page'

import { progressStrings as s } from './progress-strings'

type Filter = 'todo' | 'done' | 'all'

/** Cuándo se descargó la última copia de seguridad. */
const BACKUP_AT_KEY = 'ta-web:backup-at'
const BACKUP_APP = 'ta-web'
const BACKUP_KIND = 'checklist-progress'
const SOON_STEPS = 5
const DAY = 86_400_000

/** localStorage en try/catch: sin él (modo privado, bloqueado) la página sigue sin guardar. */
export const safeStorage: ProgressStorage = {
  getItem(key) {
    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem(key, value) {
    window.localStorage.setItem(key, value)
  },
}

export interface ProgressUi {
  /** Si el paso N pasa el filtro Pendientes, Hechos o Todos. */
  matches(n: number): boolean
  /** Lo que dice la lista vacía por el filtro, o null con Todos. */
  emptyText(): string | null
  /** Vuelve a leer lo guardado (lo cambió otra pestaña o la migración) y lo pinta. */
  reload(): void
  destroy(): void
}

interface Options {
  /** Abre el paso N al lado de la lista (o en la hoja del móvil). */
  pick(n: number): void
  /** Vuelve a aplicar el buscador y el filtro a la lista. */
  refilter(): void
}

const $$ = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) => [
  ...root.querySelectorAll<T>(selector),
]

export function startProgress(data: ChecklistIslandData, { pick, refilter }: Options): ProgressUi {
  const m = checklistModel(data)
  let progress: Progress = readProgress(safeStorage)
  let filter: Filter = 'all'
  let category = ''
  let warned = false
  const stepIdOf = (n: number) => m.steps[n - 1]?.id
  const nameOf = (id: number) =>
    document.querySelector(`.ck-q[data-q="${id}"] .ck-q__t`)?.textContent ?? String(id)
  const toastEl = document.querySelector<HTMLElement>('[data-ck-toast]')
  let toastTimer: ReturnType<typeof setTimeout> | undefined

  function toast(text: string) {
    if (!toastEl) return
    toastEl.textContent = text
    toastEl.hidden = false
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => (toastEl.hidden = true), 5000)
  }

  function save(next: Progress) {
    if (next === progress) return
    progress = next
    if (!writeProgress(safeStorage, progress) && !warned) {
      warned = true
      toast(s.notSaved)
    }
    render()
    if (filter !== 'all') refilter()
  }

  const ownedKey = (key: string, stepId?: string) =>
    Boolean(progress.owned[key] || (stepId && progress.owned[`${key}#${stepId}`]))

  function lockText(state: QuestState): string {
    const lock = state.lock
    if (lock && 'step' in lock) return s.lockedStep(lock.step)
    if (lock && 'checklist' in lock) return s.lockedChecklist(lock.checklist)
    if (lock && 'need' in lock) return s.lockedNeed(nameOf(lock.need))
    if (state.wait) return s.waiting(state.wait.map(nameOf))
    return ''
  }

  function renderQuests() {
    for (const row of $$('.ck-q[data-q]')) {
      const index = Number(row.dataset.step) - 1
      const state = questState(progress, m, index, Number(row.dataset.q))
      row.dataset.state = state.done ? 'done' : state.wait ? 'wait' : state.at ? 'stop' : 'todo'
      const hit = row.querySelector<HTMLButtonElement>('[data-q-hit]')
      if (hit) {
        const name = hit.dataset.name ?? ''
        hit.setAttribute('aria-pressed', String(state.done))
        hit.setAttribute('aria-label', state.done ? s.unmarkQuest(name) : s.markQuest(name))
        hit.disabled = Boolean(state.lock)
      }
      const lock = row.querySelector<HTMLElement>('[data-ck-lock]')
      if (lock) {
        const text = lockText(state)
        lock.textContent = text
        lock.hidden = !text
      }
      // Los objetivos hechos: hasta donde va la misión (la parada, aunque su paso esté hecho).
      const saved = progress.quests[row.dataset.q ?? '']?.o
      const reached = typeof saved === 'number' && saved > 0 ? saved : state.done ? Infinity : 0
      for (const objective of $$('.ck-o', row)) {
        objective.dataset.state = Number(objective.dataset.i) < reached ? 'done' : 'todo'
      }
    }
  }

  function badge(tab: 'pre' | 'obj', pending: number) {
    const el = document.querySelector<HTMLElement>(`[data-tab="${tab}"] .ck-badge`)
    if (!el) return
    el.textContent = pending ? String(pending) : '✓'
    el.toggleAttribute('data-ok', !pending)
    el.setAttribute('aria-label', s.pendingBadge(pending, tab))
  }

  function renderItems() {
    // Lo de cada paso de Necesitarás: conseguido, o gastado si el paso está hecho.
    for (const box of $$<HTMLInputElement>('[data-own]')) {
      const [key, stepId] = (box.dataset.own ?? '').split('#')
      const used = stepDone(progress, m, m.index.get(stepId) ?? -1)
      box.checked = used || ownedKey(key, stepId)
      box.disabled = used
      box.closest('.ck-need')?.toggleAttribute('data-owned', box.checked)
    }
    // Objetos: cada objeto sumado, en su grupo.
    const pendingWithItems = new Set<number>()
    const slots = $$('[data-ck-slot]')
    for (const slot of slots) {
      for (const n of (slot.dataset.steps ?? '').split(' ').map(Number)) {
        if (!stepDone(progress, m, n - 1)) pendingWithItems.add(n)
      }
    }
    const soon = new Set([...pendingWithItems].sort((a, b) => a - b).slice(0, SOON_STEPS))
    const pendingOnly =
      document.querySelector<HTMLInputElement>('[data-ck-pending]')?.checked ?? true
    const lists = new Map(
      $$('[data-ck-group]').map((section) => [section.dataset.ckGroup, section] as const),
    )
    const sorted = {
      soon: [] as HTMLElement[],
      later: [] as HTMLElement[],
      used: [] as HTMLElement[],
    }
    let pending = 0
    for (const slot of slots) {
      const key = slot.dataset.ckSlot ?? ''
      const steps = (slot.dataset.steps ?? '').split(' ').map(Number)
      const used = steps.every((n) => stepDone(progress, m, n - 1))
      const have = steps.every((n) => stepDone(progress, m, n - 1) || ownedKey(key, stepIdOf(n)))
      if (!have) pending++
      const box = slot.querySelector<HTMLInputElement>('input')
      if (box) {
        box.checked = have
        box.disabled = used
      }
      slot.toggleAttribute('data-owned', have)
      slot.toggleAttribute('data-used', used)
      slot.hidden = Boolean(category) && slot.dataset.cat !== category
      sorted[used ? 'used' : steps.some((n) => soon.has(n)) ? 'soon' : 'later'].push(slot)
    }
    for (const [group, list] of Object.entries(sorted)) {
      const section = lists.get(group)
      const ul = section?.querySelector('ul')
      if (!section || !ul) continue
      for (const slot of list) if (slot.parentElement !== ul) ul.append(slot)
      const shown = list.filter((slot) => !slot.hidden).length
      const count = section.querySelector('[data-ck-gc]')
      if (count) count.textContent = s.groupCount(shown)
      section.hidden = !shown || (group === 'used' && pendingOnly)
    }
    badge('obj', pending)
  }

  function render() {
    const done = stepsDone(progress, m)
    const next = nextPending(progress, m)
    for (const box of $$<HTMLInputElement>('[data-step-check]')) {
      box.checked = stepDone(progress, m, Number(box.dataset.stepCheck) - 1)
    }
    for (const row of $$('.ck-row')) {
      const n = Number(row.dataset.n)
      row.toggleAttribute('data-done', stepDone(progress, m, n - 1))
      row.toggleAttribute('data-next', next === n - 1)
    }
    for (const button of $$<HTMLButtonElement>('[data-complete]')) {
      const n = Number(button.dataset.complete)
      const isDone = stepDone(progress, m, n - 1)
      button.textContent = isDone ? s.uncomplete(n) : s.complete(n)
      button.toggleAttribute('data-done', isDone)
      button.setAttribute('aria-pressed', String(isDone))
    }

    const pct = progressPct(progress, m)
    const pctText = s.pct(pct)
    for (const el of $$('[data-ck-pct]')) el.textContent = pctText
    const bar = document.querySelector<HTMLElement>('[data-ck-bar]')
    if (bar) {
      bar.style.setProperty('--ratio', String(pct / 100))
      bar.setAttribute('aria-valuenow', String(Math.round(pct)))
      bar.setAttribute('aria-valuetext', s.barValue(pctText, done, m.steps.length))
    }
    for (const el of $$('[data-ck-sdone]')) el.textContent = String(done)
    const nextButton = document.querySelector<HTMLElement>('[data-ck-next]')
    if (nextButton) {
      nextButton.toggleAttribute('data-finished', next < 0)
      const label = nextButton.querySelector('[data-ck-next-n]')
      if (label) label.textContent = String(next + 1)
    }
    const counts = { todo: m.steps.length - done, done, all: m.steps.length }
    for (const el of $$('[data-ck-fc]')) el.textContent = String(counts[el.dataset.ckFc as Filter])

    renderQuests()

    let prereqsPending = 0
    for (const box of $$<HTMLInputElement>('[data-pre-check]')) {
      box.checked = Boolean(progress.prereqs[`${m.id}:${box.dataset.preCheck}`])
      if (!box.checked) prereqsPending++
    }
    badge('pre', prereqsPending)
    renderItems()
  }

  // ---------- la copia de seguridad y el reinicio ----------
  const dialog = (name: string) =>
    document.querySelector<HTMLDialogElement>(`[data-ck-dialog="${name}"]`)

  function backupState() {
    const el = document.querySelector<HTMLElement>('[data-ck-backup-state]')
    if (!el) return
    const at = Number(safeStorage.getItem(BACKUP_AT_KEY))
    if (!at) {
      el.textContent = s.backupNever
      el.setAttribute('data-warn', '')
      return
    }
    const days = Math.floor((Date.now() - at) / DAY)
    el.textContent = s.backupAge(days)
    el.toggleAttribute('data-warn', days > 14)
  }

  function download() {
    const at = new Date()
    const body = { app: BACKUP_APP, kind: BACKUP_KIND, v: 1, at: at.toISOString(), progress }
    const link = document.createElement('a')
    link.href = URL.createObjectURL(
      new Blob([JSON.stringify(body, null, 2)], { type: 'application/json' }),
    )
    link.download = `progreso-checklists-${at.toISOString().slice(0, 10)}.json`
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
    try {
      safeStorage.setItem(BACKUP_AT_KEY, String(at.getTime()))
    } catch {
      // Sin guardar la fecha: la próxima vez dirá que no hay copia
    }
    backupState()
    toast(s.downloaded)
  }

  async function restore(file: File) {
    try {
      const json = JSON.parse(await file.text()) as Record<string, unknown>
      if (json.app !== BACKUP_APP || json.kind !== BACKUP_KIND) throw new Error('otra cosa')
      const restored = parseProgress(JSON.stringify(json.progress))
      save(restored)
      dialog('backup')?.close()
      toast(s.restored)
    } catch {
      toast(s.badBackup)
    }
  }

  function wholeKeys() {
    return $$('[data-ck-slot]').map((slot) => slot.dataset.ckSlot ?? '')
  }

  function openReset() {
    const counts = {
      steps: stepsDone(progress, m),
      prereqs: Object.keys(progress.prereqs).filter((key) => key.startsWith(`${m.id}:`)).length,
      owned: Object.keys(progress.owned).filter((key) => {
        const step = key.split('#')[1]
        return step ? m.index.has(step) : wholeKeys().includes(key)
      }).length,
    }
    for (const el of $$('[data-ck-reset-count]')) {
      el.textContent = s.resetCount(counts[el.dataset.ckResetCount as keyof typeof counts])
    }
    dialog('reset')?.showModal()
  }

  function onResetClose(this: HTMLDialogElement) {
    if (this.returnValue !== 'reset') return
    const chosen = (key: string) =>
      document.querySelector<HTMLInputElement>(`[data-ck-reset="${key}"]`)?.checked ?? false
    save(
      resetChecklist(
        progress,
        m,
        { steps: chosen('steps'), prereqs: chosen('prereqs'), owned: chosen('owned') },
        wholeKeys(),
      ),
    )
    toast(s.resetDone)
  }

  // ---------- lo que hace quien lee ----------
  const menuButton = document.querySelector<HTMLElement>('[data-ck-more]')
  const menu = document.querySelector<HTMLElement>('#ck-more')
  const setMenu = (open: boolean) => {
    menuButton?.setAttribute('aria-expanded', String(open))
    if (menu) menu.hidden = !open
  }

  function completeStep(n: number) {
    const index = n - 1
    const was = stepDone(progress, m, index)
    save(setStep(progress, m, index, !was, Date.now()))
    if (was || !stepDone(progress, m, index)) return
    for (const closed of m.closes.get(m.steps[index].id) ?? []) {
      const at = m.index.get(closed)
      if (at !== undefined && !stepDone(progress, m, at)) toast(s.closedPending(at + 1))
    }
    // Hecho el paso, se abre el siguiente pendiente después de él.
    const after = m.steps.findIndex((_, at) => at > index && !stepDone(progress, m, at))
    if (after >= 0) setTimeout(() => pick(after + 1), 260)
  }

  function onClick(event: MouseEvent) {
    const target = event.target instanceof Element ? event.target : null
    if (!target) return
    if (!target.closest('.ck-tools')) setMenu(false)
    const hit = target.closest<HTMLButtonElement>('[data-q-hit]')
    if (hit) {
      const row = hit.closest<HTMLElement>('.ck-q')
      const index = Number(row?.dataset.step) - 1
      const id = Number(row?.dataset.q)
      save(
        setQuest(progress, m, index, id, hit.getAttribute('aria-pressed') !== 'true', Date.now()),
      )
      return
    }
    const complete = target.closest<HTMLElement>('[data-complete]')
    if (complete) return completeStep(Number(complete.dataset.complete))
    if (target.closest('[data-ck-next]')) {
      const next = nextPending(progress, m)
      if (next < 0) return
      if (filter === 'done') setFilter('all')
      pick(next + 1)
      return
    }
    const filterButton = target.closest<HTMLElement>('[data-ck-f]')
    if (filterButton) return setFilter(filterButton.dataset.ckF as Filter)
    const pre = target.closest<HTMLElement>('[data-ck-pre]')
    if (pre) {
      const on = pre.dataset.ckPre === 'all'
      let next = progress
      for (const box of $$<HTMLInputElement>('[data-pre-check]')) {
        next = setPrereq(next, m, box.dataset.preCheck ?? '', on, Date.now())
      }
      return save(next)
    }
    const cat = target.closest<HTMLElement>('[data-ck-cat]')
    if (cat) {
      category = cat.dataset.ckCat ?? ''
      for (const button of $$('[data-ck-cat]')) {
        button.setAttribute('aria-pressed', String(button === cat))
      }
      return renderItems()
    }
    if (target.closest('[data-ck-more]')) return setMenu(menu?.hidden ?? false)
    const tool = target.closest<HTMLElement>('[data-ck-tool]')
    if (tool) {
      setMenu(false)
      if (tool.dataset.ckTool === 'reset') return openReset()
      backupState()
      return dialog('backup')?.showModal()
    }
    if (target.closest('[data-ck-dialog-close]')) return target.closest('dialog')?.close()
    if (target.closest('[data-ck-download]')) return download()
    // Un clic fuera del rectángulo del diálogo lo cierra.
    if (target instanceof HTMLDialogElement && target.matches('.ck-dlg')) {
      const box = target.getBoundingClientRect()
      const { clientX: x, clientY: y } = event
      if (x < box.left || x > box.right || y < box.top || y > box.bottom) target.close()
    }
  }

  function onChange(event: Event) {
    const box = event.target instanceof HTMLInputElement ? event.target : null
    if (!box) return
    const now = Date.now()
    if (box.dataset.stepCheck) {
      return save(setStep(progress, m, Number(box.dataset.stepCheck) - 1, box.checked, now))
    }
    if (box.dataset.preCheck) {
      return save(setPrereq(progress, m, box.dataset.preCheck, box.checked, now))
    }
    if (box.dataset.own) return save(setOwned(progress, [box.dataset.own], box.checked, now))
    const slot = box.closest<HTMLElement>('[data-ck-slot]')
    if (slot) {
      const key = slot.dataset.ckSlot ?? ''
      const steps = (slot.dataset.steps ?? '').split(' ').map(Number)
      const parts = steps.flatMap((n) => {
        const id = stepIdOf(n)
        return id && !stepDone(progress, m, n - 1) ? [`${key}#${id}`] : []
      })
      // Al desmarcarlo, también lo marcado entero (una copia o la checklist antigua).
      return save(setOwned(progress, box.checked ? parts : [...parts, key], box.checked, now))
    }
    if (box.hasAttribute('data-ck-pending')) return renderItems()
    if (box.hasAttribute('data-ck-restore') && box.files?.[0]) {
      void restore(box.files[0])
      box.value = ''
    }
  }

  function setFilter(next: Filter) {
    filter = next
    for (const button of $$('[data-ck-f]')) {
      button.setAttribute('aria-pressed', String(button.dataset.ckF === next))
    }
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
    reload()
  }

  function reload() {
    progress = readProgress(safeStorage)
    render()
    refilter()
  }

  const howto = document.querySelectorAll('.ck-q__howto')
  for (const el of howto) el.textContent = s.questHowto
  const resetDialog = dialog('reset')
  document.addEventListener('click', onClick)
  document.addEventListener('change', onChange)
  document.addEventListener('keydown', onKeyDown)
  window.addEventListener('storage', onStorage)
  resetDialog?.addEventListener('close', onResetClose)
  render()

  return {
    matches: (n) => filter === 'all' || (filter === 'done') === stepDone(progress, m, n - 1),
    emptyText: () => (filter === 'all' ? null : s.filterEmpty[filter]),
    reload,
    destroy() {
      clearTimeout(toastTimer)
      document.removeEventListener('click', onClick)
      document.removeEventListener('change', onChange)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('storage', onStorage)
      resetDialog?.removeEventListener('close', onResetClose)
    },
  }
}
