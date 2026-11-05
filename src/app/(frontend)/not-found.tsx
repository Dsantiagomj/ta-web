import Link from 'next/link'

import { notFoundStrings as s } from './strings'

// 404 del sitio público, en español. Next añade noindex a esta respuesta.
export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-(--width-page) flex-col gap-4 px-4 py-16 sm:px-6 lg:px-12">
      <h1 className="font-display text-4xl text-ink uppercase">{s.title}</h1>
      <p className="max-w-[60ch] text-lg text-ink-2">{s.lead}</p>
      <p>
        <Link href="/">{s.home}</Link>
      </p>
    </main>
  )
}
