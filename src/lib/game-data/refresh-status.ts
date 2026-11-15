import type { GameDataRefresh } from '../../payload-types'
import { panelStrings } from '../admin/strings'

const t = panelStrings.gameDataRefresh

/** La línea del último refresco, arriba de «Refrescos de datos»: resultado, quién y cuándo. */
export function refreshStatusLine(
  run: Pick<GameDataRefresh, 'status' | 'trigger' | 'startedAt' | 'finishedAt'> | null,
  formatDate: (iso: string) => string,
): string {
  if (!run) return t.never
  const when = run.finishedAt
    ? `empezó ${formatDate(run.startedAt)}, acabó ${formatDate(run.finishedAt)}`
    : `empezó ${formatDate(run.startedAt)}`
  return `${t.last} ${t.statuses[run.status]} · ${t.triggers[run.trigger]} · ${when}.`
}
