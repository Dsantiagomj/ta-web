import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import FrontendError from '@/app/(frontend)/error'

// Las páginas de error (DESIGN.md, Layout): como la 404, el título de página en Rowdies, una
// frase y los botones; nunca la página en blanco de Next.

const error = Object.assign(new Error('fallo'), { digest: 'abc' })
const reset = () => {}

describe('error.tsx del sitio', () => {
  const markup = renderToStaticMarkup(<FrontendError error={error} reset={reset} />)

  it('lleva el título de página, la frase y no enseña el error', () => {
    expect(markup).toMatch(/<h1 class="[^"]*font-title[^"]*uppercase[^"]*">Algo ha fallado<\/h1>/)
    expect(markup).not.toContain('fallo')
  })

  it('reintenta con el botón principal y vuelve a la portada con el secundario', () => {
    expect(markup).toMatch(/<button[^>]*data-variant="primary"[^>]*>Volver a intentarlo<\/button>/)
    expect(markup).toMatch(
      /<a data-variant="secondary"[^>]*href="\/"[^>]*>Volver a la portada<\/a>/,
    )
  })
})
