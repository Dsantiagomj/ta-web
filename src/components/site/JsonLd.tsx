import { jsonForScript } from '@/lib/seo/json-ld'

/** Datos estructurados de schema.org en la página (AGENTS.md, SEO). Sin JavaScript. */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonForScript(data) }} />
  )
}
