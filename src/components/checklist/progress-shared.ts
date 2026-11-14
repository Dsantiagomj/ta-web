// Lo que comparten el progreso de una checklist de pasos (progress-ui.ts) y el de una de almas
// (souls-ui.ts): localStorage en try/catch, el aviso de abajo, la copia de seguridad y los
// diálogos. Se carga con ellos, con import(), nunca con la isla.
import {
  backupFile,
  parseBackup,
  type Progress,
  type ProgressStorage,
} from '@/lib/checklists/progress/store'

import { calendarDaysBetween, progressStrings as s } from './progress-strings'

/** Cuándo se descargó la última copia de seguridad. */
const BACKUP_AT_KEY = 'ta-web:backup-at'

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

/** Un diálogo del progreso por su nombre («backup», «reset»). */
export const progressDialog = (name: string) =>
  document.querySelector<HTMLDialogElement>(`[data-ck-dialog="${name}"]`)

/** El aviso de abajo (`data-ck-toast`): dice algo cinco segundos; `clear` para su reloj. */
export function createToast(): { show: (text: string) => void; clear: () => void } {
  const el = document.querySelector<HTMLElement>('[data-ck-toast]')
  let timer: ReturnType<typeof setTimeout> | undefined
  const show = (text: string) => {
    if (!el) return
    // Con un diálogo abierto, lo de fuera queda inerte y debajo: el aviso va dentro de él, en
    // la capa de arriba, donde se ve y se anuncia.
    const host = document.querySelector('dialog[open]') ?? document.body
    if (el.parentElement !== host) host.append(el)
    el.textContent = text
    el.hidden = false
    clearTimeout(timer)
    timer = setTimeout(() => (el.hidden = true), 5000)
  }
  return { show, clear: () => clearTimeout(timer) }
}

/** La copia de seguridad: cuándo fue la última, descargarla y restaurarla. */
export function createBackup(options: {
  get: () => Progress
  save: (next: Progress) => void
  toast: (text: string) => void
}) {
  function state() {
    const el = document.querySelector<HTMLElement>('[data-ck-backup-state]')
    if (!el) return
    const at = Number(safeStorage.getItem(BACKUP_AT_KEY))
    if (!at) {
      el.textContent = s.backupNever
      el.setAttribute('data-warn', '')
      return
    }
    const days = calendarDaysBetween(new Date(at), new Date())
    el.textContent = s.backupAge(days)
    el.toggleAttribute('data-warn', days > 14)
  }

  function download() {
    const at = new Date()
    const body = backupFile(options.get(), at)
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
    state()
    options.toast(s.downloaded)
  }

  async function restore(file: File) {
    let restored: Progress | null = null
    try {
      restored = parseBackup(await file.text())
    } catch {
      restored = null
    }
    // Una copia que no se entiende entera no escribe nada.
    if (!restored) return options.toast(s.badBackup)
    options.save(restored)
    progressDialog('backup')?.close()
    options.toast(s.restored)
  }

  return { state, download, restore }
}

/** Un clic fuera del rectángulo de un diálogo del progreso lo cierra. */
export function closeOnOutsideClick(target: Element, event: MouseEvent) {
  if (!(target instanceof HTMLDialogElement) || !target.matches('.ck-dlg')) return
  const box = target.getBoundingClientRect()
  const { clientX: x, clientY: y } = event
  if (x < box.left || x > box.right || y < box.top || y > box.bottom) target.close()
}
