import { getTranslation } from '@payloadcms/translations'
import { Gutter } from '@payloadcms/ui'
import { DefaultTemplate } from '@payloadcms/next/templates'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'

import { PANEL_GUIDE_PATH, preparingOnSite } from '@/lib/admin/panel-guide'
import { panelStrings } from '@/lib/admin/strings'

const guide = panelStrings.guide

/**
 * La «Guía del panel» (A-14). Una vista propia de Payload no lleva la plantilla del panel
 * ni pide sesión por su cuenta: aquí se ponen las dos cosas, como las vistas de Payload.
 */
export function PanelGuide({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, locale, permissions, visibleEntities } = initPageResult
  const adminRoute = req.payload.config.routes.admin
  if (!req.user) redirect(`${adminRoute}/login?redirect=${adminRoute}${PANEL_GUIDE_PATH}`)

  // Solo lo que esta cuenta ve en el menú y puede leer, con la línea que ya lleva la colección.
  const visible = new Set<string>(visibleEntities.collections)
  const groups = req.payload.config.collections
    .filter((collection) => visible.has(collection.slug))
    .filter((collection) => permissions?.collections?.[collection.slug]?.read)
    .map((collection) => {
      const description = collection.admin?.description
      return {
        slug: collection.slug,
        label: getTranslation(collection.labels.plural, req.i18n),
        description:
          typeof description === 'string' || (description && typeof description === 'object')
            ? getTranslation(description as Record<string, string> | string, req.i18n)
            : null,
      }
    })
  const role = (req.user as { role?: string | null }).role

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      req={req}
      searchParams={searchParams}
      user={req.user}
      viewType="panelGuide"
      // Una copia: el objeto de initPageResult está congelado y React 19 lo intenta escribir.
      visibleEntities={{
        collections: [...visibleEntities.collections],
        globals: [...visibleEntities.globals],
      }}
    >
      <Gutter className="ta-guide">
        <h1>{guide.title}</h1>
        <p className="ta-guide__intro">{guide.intro}</p>
        <nav className="ta-guide__toc" aria-labelledby="ta-guide-toc">
          <h2 id="ta-guide-toc">{guide.contents}</h2>
          <ol>
            {guide.sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>{section.title}</a>
              </li>
            ))}
          </ol>
        </nav>
        {guide.sections.map((section) => (
          <section key={section.id} id={section.id} className="ta-guide__section">
            <h2>{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.id === 'en-preparacion' && (
              <ul className="ta-guide__cases">
                {preparingOnSite().map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
            {section.id === 'partes' && (
              <>
                <p className="ta-guide__role">
                  <strong>{guide.yourRole(role)}</strong>
                </p>
                <dl className="ta-guide__parts">
                  {groups.map((group) => (
                    <div key={group.slug}>
                      <dt>
                        <Link href={`${adminRoute}/collections/${group.slug}`}>{group.label}</Link>
                      </dt>
                      {group.description && <dd>{group.description}</dd>}
                    </div>
                  ))}
                </dl>
              </>
            )}
          </section>
        ))}
      </Gutter>
    </DefaultTemplate>
  )
}
