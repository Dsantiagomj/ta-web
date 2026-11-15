'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { flushSync } from 'react-dom'

import { panelStrings } from '@/lib/admin/strings'
import { REFRESH_ENDPOINT_PATH } from '@/lib/game-data/refresh-run-values'

const t = panelStrings.gameDataRefresh

type State = 'starting' | 'started' | 'busy' | 'failedToStart' | null

/** El botón «Traer ahora»: lanza el refresco en el servidor y no espera a que acabe. */
export function GameDataRefreshButton({ running }: { running: boolean }) {
  const router = useRouter()
  const [state, setState] = useState<State>(running ? 'busy' : null)

  async function start() {
    // El aviso se vacía antes, para que un lector de pantalla anuncie cada pulsación.
    flushSync(() => setState('starting'))
    try {
      const response = await fetch(`/api${REFRESH_ENDPOINT_PATH}`, {
        method: 'POST',
        credentials: 'include',
      })
      setState(
        response.status === 202 ? 'started' : response.status === 409 ? 'busy' : 'failedToStart',
      )
      // La línea del último refresco y la lista se leen en el servidor.
      router.refresh()
    } catch {
      setState('failedToStart')
    }
  }

  return (
    <div className="ta-fill">
      <button
        type="button"
        className="btn btn--style-primary btn--size-small ta-fill__button"
        disabled={state === 'starting' || state === 'started' || state === 'busy'}
        onClick={start}
      >
        {t.button}
      </button>
      <span role="status" className="ta-fill__status">
        {state ? t[state] : ''}
      </span>
    </div>
  )
}
