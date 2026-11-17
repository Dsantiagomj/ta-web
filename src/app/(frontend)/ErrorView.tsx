import { buttonClass } from '@/components/ui/Button'

import { errorStrings as s } from './strings'

/**
 * Lo que enseña error.tsx, como la 404: el título de página, una frase y dos botones. Sin
 * estado ni efectos: error.tsx es una isla de cliente que Next carga en cada página, así que
 * pesa lo mínimo.
 */
export function ErrorView({ reset }: { reset: () => void }) {
  return (
    <main id="contenido" className="flex flex-col gap-4 px-(--frame-pad) py-16">
      <h1 className="font-title text-4xl text-ink uppercase">{s.title}</h1>
      <p className="max-w-[60ch] text-lg text-ink-2">{s.lead}</p>
      <p className="flex flex-wrap gap-3">
        <button type="button" data-variant="primary" className={buttonClass({})} onClick={reset}>
          {s.retry}
        </button>
        {/* Un enlace normal: la portada se carga entera, con la transición entre páginas. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- carga entera a propósito (DESIGN.md, Motion) */}
        <a data-variant="secondary" className={buttonClass({ variant: 'secondary' })} href="/">
          {s.home}
        </a>
      </p>
    </main>
  )
}
