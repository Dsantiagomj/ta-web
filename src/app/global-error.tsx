'use client'

import '@/styles/globals.css'

import { ErrorView } from './(frontend)/ErrorView'
import { errorStrings as s } from './(frontend)/strings'

// Cuando falla el layout del sitio, Next pinta esto en su lugar, con su propio <html>. Next
// solo lo busca en la raíz de app/, no dentro de (frontend). Lo mismo que error.tsx, en Amakna
// oscuro, el tema por defecto. Sin las fuentes ni el script del tema: Next lo carga en cada
// página y el presupuesto de JavaScript de las guías no da para más (DESIGN.md, Error pages).
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="es" data-theme="amakna" data-mode="dark">
      <head>
        <title>{s.meta}</title>
      </head>
      <body>
        <ErrorView reset={reset} />
      </body>
    </html>
  )
}
