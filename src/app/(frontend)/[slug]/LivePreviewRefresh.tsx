'use client'

import { RefreshRouteOnSave } from '@payloadcms/live-preview-react'
import { useRouter } from 'next/navigation'
import { useCallback, useSyncExternalStore } from 'react'

const noSubscription = () => () => {}

/**
 * Vista previa en vivo del panel: avisa al panel de que la página está lista y la vuelve a
 * pintar en el servidor cada vez que Torre guarda. Solo se pinta en draft mode, así que su
 * JavaScript no llega a los visitantes.
 */
export function LivePreviewRefresh() {
  const router = useRouter()
  const refresh = useCallback(() => router.refresh(), [router])
  // El origen solo existe en el navegador; en el servidor no se pinta nada.
  const origin = useSyncExternalStore(
    noSubscription,
    () => window.location.origin,
    () => null,
  )
  if (!origin) return null
  return <RefreshRouteOnSave refresh={refresh} serverURL={origin} />
}
