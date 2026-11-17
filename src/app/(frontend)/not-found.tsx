import { ButtonLink } from '@/components/ui/Button'

import { notFoundStrings as s } from './strings'

// 404 del sitio público, en español. Next añade noindex a esta respuesta.
export default function NotFound() {
  return (
    <main id="contenido" className="flex flex-col gap-4 px-(--frame-pad) py-16">
      <h1 className="font-title text-4xl text-ink uppercase">{s.title}</h1>
      <p className="max-w-[60ch] text-lg text-ink-2">{s.lead}</p>
      <p>
        {/* El botón principal relleno, como enlace normal: la portada llega con la transición
            entre páginas (DESIGN.md, Motion). */}
        <ButtonLink href="/">{s.home}</ButtonLink>
      </p>
    </main>
  )
}
