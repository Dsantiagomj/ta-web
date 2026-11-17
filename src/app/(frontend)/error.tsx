'use client'

import { ErrorView } from './ErrorView'

// Un error dentro del sitio: la cabecera y el pie siguen, y en el contenido, como la 404, el
// título de página, una frase y dos botones (ErrorView).
export default function FrontendError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorView reset={reset} />
}
