import { notFoundStrings as s } from './strings'

// 404 del sitio público, en español. Next añade noindex a esta respuesta.
export default function NotFound() {
  return (
    <main
      id="contenido"
      className="mx-auto flex max-w-(--width-page) flex-col gap-4 px-4 py-16 sm:px-6 lg:px-12"
    >
      <h1 className="font-display text-4xl text-ink">{s.title}</h1>
      <p className="max-w-[60ch] text-lg text-ink-2">{s.lead}</p>
      <p>
        {/* Un enlace normal: la portada llega con la transición entre páginas. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- carga entera a propósito (DESIGN.md, Motion) */}
        <a href="/">{s.home}</a>
      </p>
    </main>
  )
}
