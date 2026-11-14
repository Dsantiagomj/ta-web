// Los textos del progreso de la checklist (la franja, las casillas, los filtros, la copia de
// seguridad y el reinicio), aparte de island-strings.ts: los usa progress-ui.ts, que la isla
// carga con import(), y la página. Así no viajan con la isla a las demás páginas de /<slug>.

/** Los días del calendario entre dos fechas, en la zona horaria de quien lee. */
export function calendarDaysBetween(from: Date, to: Date): number {
  const day = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.round((day(to) - day(from)) / 86_400_000)
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

/** «A», «A» y «B», «A», «B» y «C». */
const names = (list: string[]) => {
  const quoted = list.map((name) => `«${name}»`)
  return quoted.length > 1 ? `${quoted.slice(0, -1).join(', ')} y ${quoted.at(-1)}` : quoted[0]
}

export const progressStrings = {
  barLabel: (name: string) => `Progreso del ${name}`,
  barValue: (pct: string, done: number, total: number) => `${pct}, ${done} de ${total} pasos`,
  pct: (value: number) => `${value.toLocaleString('es', { maximumFractionDigits: 1 })} %`,
  steps: 'pasos',
  next: 'Siguiente:',
  finished: '¡Checklist terminada!',
  filterLabel: 'Mostrar',
  filters: { todo: 'Pendientes', done: 'Hechos', all: 'Todos' },
  filterEmpty: { todo: 'No te queda ningún paso.', done: 'Aún no has hecho ningún paso.' },
  stepDone: (n: number) => `Paso ${n} hecho`,
  complete: (n: number) => `Completar paso ${n}`,
  uncomplete: (n: number) => `Desmarcar paso ${n}`,
  questHowto:
    'Pulsa una misión para darla por hecha. Su nombre abre su guía de Torrente Arcano, con adónde ir y qué hacer.',
  markQuest: (name: string) => `Marcar «${name}» como hecha`,
  unmarkQuest: (name: string) => `Marcar «${name}» sin hacer`,
  lockedStep: (n: number) => `Hecha en el paso ${n}`,
  lockedChecklist: (name: string | null) =>
    name ? `Hecha en la checklist del ${name}` : 'Hecha en otra checklist',
  lockedNeed: (name: string) => `La pide “${name}”`,
  /** La terminó sola el juego al terminar otra («Bienvenido a Frigost»). */
  lockedAlone: (name: string | null) =>
    name ? `Se terminó sola con “${name}”` : 'Se terminó sola con las que la terminan',
  /** Una fila genérica hecha con una de sus misiones en otra parte. */
  lockedAny: 'Hecha con una de sus misiones',
  /** Una madre a medias que espera a sus hijas. */
  waiting: (kids: string[]) => `Espera a ${names(kids)}`,
  /** En la ruta de la madre: dónde se hacen sus hijas. */
  kidsHere: (kids: string[]) => `Aquí se hacen también ${names(kids)}.`,
  stopped: (objective: number) => `Hasta el objetivo ${objective}`,
  pendingBadge: (count: number, kind: 'pre' | 'obj') =>
    count
      ? kind === 'pre'
        ? plural(count, 'prerrequisito pendiente', 'prerrequisitos pendientes')
        : plural(count, 'objeto pendiente', 'objetos pendientes')
      : 'Todo listo',
  prereqAll: 'Marcar todo',
  prereqNone: 'Limpiar',
  prereqHowto: '«Marcar todo» marca todos los prerrequisitos y «Limpiar» los desmarca.',
  own: (name: string) => `Ya tengo ${name}`,
  groups: { soon: 'Tus próximos pasos', later: 'Más adelante', used: 'Ya utilizados' },
  groupCount: (count: number) => `· ${plural(count, 'objeto', 'objetos')}`,
  pendingOnly: 'Solo pasos pendientes',
  categories: 'Categoría',
  allCategories: 'Todo',
  more: 'Más opciones',
  backup: 'Copia de seguridad',
  backupIntro:
    'Tu progreso se guarda solo en este navegador. Si borras sus datos o cambias de equipo, se pierde. Descarga una copia de vez en cuando.',
  backupNever: 'Aún no has descargado ninguna copia.',
  backupAge: (days: number) =>
    days <= 0
      ? 'Tu última copia es de hoy.'
      : days === 1
        ? 'Tu última copia es de ayer.'
        : `Tu última copia es de hace ${days} días.${days > 14 ? ' Descarga una nueva.' : ''}`,
  download: 'Descargar copia',
  restore: 'Restaurar una copia',
  downloaded: 'Copia descargada.',
  restored: 'Copia restaurada.',
  badBackup: 'Ese archivo no es una copia del progreso de las checklists.',
  reset: 'Reiniciar el progreso',
  resetIntro:
    'Elige qué borrar de esta checklist. Lo de las demás checklists no se toca. No se puede deshacer.',
  resetWhat: 'Qué borrar',
  resetSteps: 'Pasos y misiones',
  resetPrereqs: 'Prerrequisitos',
  resetOwned: 'Objetos',
  resetSouls: 'Las almas que tienes',
  resetCount: (count: number) => `(${count})`,
  resetConfirm: 'Reiniciar',
  cancel: 'Cancelar',
  close: 'Cerrar',
  resetDone: 'Progreso reiniciado.',
  notSaved: 'Este navegador no deja guardar el progreso: se perderá al cerrar la página.',
  closedPending: (n: number) => `El paso ${n} sigue pendiente: le faltan misiones.`,
}
