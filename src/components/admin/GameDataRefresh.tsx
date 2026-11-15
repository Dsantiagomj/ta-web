import type { BeforeListServerProps } from 'payload'

import { isAdminUser } from '@/collections/editorial-access'
import { panelStrings, relativeTime } from '@/lib/admin/strings'
import { lastGameDataRefresh } from '@/lib/game-data/refresh-runs'
import { refreshStatusLine } from '@/lib/game-data/refresh-status'

import { GameDataRefreshButton } from './GameDataRefreshButton'

const t = panelStrings.gameDataRefresh

/**
 * Arriba de «Refrescos de datos»: cómo acabó el último refresco de DofusDB y, para una
 * cuenta de administrador, el botón para traer los datos ahora sin esperar a la tarea
 * semanal.
 */
export async function GameDataRefresh({ payload, user }: BeforeListServerProps) {
  const last = await lastGameDataRefresh(payload)
  const now = new Date()
  const running = last?.status === 'running'

  return (
    <section className="ta-refresh" aria-labelledby="ta-refresh-title">
      <h2 id="ta-refresh-title" className="ta-refresh__title">
        {t.title}
      </h2>
      <p className="ta-refresh__help">{t.help}</p>
      <p className="ta-refresh__last">{refreshStatusLine(last, (iso) => relativeTime(iso, now))}</p>
      {last?.status === 'failed' && last.error ? (
        <p className="ta-refresh__error">{last.error}</p>
      ) : null}
      {isAdminUser(user) ? (
        <GameDataRefreshButton running={running} />
      ) : (
        <p className="ta-refresh__note">{t.adminOnly}</p>
      )}
    </section>
  )
}
