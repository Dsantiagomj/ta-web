'use client'

import { useRouter } from 'next/navigation'
import { lazy, Suspense, useCallback, useSyncExternalStore } from 'react'

const noSubscription = () => () => {}

// El componente de Payload llega con import() al pintarse: la ruta /<slug> manda sus islas a
// todas sus páginas, aunque esta solo se pinte en draft mode.
const RefreshRouteOnSave = lazy(() =>
  import('@payloadcms/live-preview-react').then(({ RefreshRouteOnSave }) => ({
    default: RefreshRouteOnSave,
  })),
)

/**
 * Vista previa en vivo del panel: avisa al panel de que la página está lista y la vuelve a
 * pintar en el servidor cada vez que Torre guarda. Solo se pinta en draft mode y el código de
 * Payload llega con import(), así que no llega a los visitantes.
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
  return (
    <Suspense>
      <RefreshRouteOnSave refresh={refresh} serverURL={origin} />
    </Suspense>
  )
}
