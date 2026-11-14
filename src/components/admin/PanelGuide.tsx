import { Gutter } from '@payloadcms/ui'
import { DefaultTemplate } from '@payloadcms/next/templates'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps, ServerProps } from 'payload'

import { collectionDescriptions, PANEL_GUIDE_PATH, panelGuide } from '@/lib/admin/panel-guide'

/**
 * La «Guía del panel» (A-14). Una vista propia de Payload no lleva la plantilla del panel
 * ni pide sesión por su cuenta: aquí se ponen las dos cosas.
 */
export function PanelGuide({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, locale, permissions, visibleEntities } = initPageResult
  const adminRoute = req.payload.config.routes.admin
  if (!req.user) redirect(`${adminRoute}/login?redirect=${adminRoute}${PANEL_GUIDE_PATH}`)

  const groups = req.payload.config.collections
    .filter((collection) => collection.slug in collectionDescriptions)
    .map((collection) => ({
      slug: collection.slug,
      label: labelText(collection.labels.plural, collection.slug),
      description: collectionDescriptions[collection.slug as keyof typeof collectionDescriptions],
    }))

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      searchParams={searchParams}
      user={req.user}
      visibleEntities={visibleEntities}
    >
      <Gutter className="ta-guide">
        <h1>{panelGuide.title}</h1>
        <p className="ta-guide__intro">{panelGuide.intro}</p>
        <nav className="ta-guide__toc" aria-labelledby="ta-guide-toc">
          <h2 id="ta-guide-toc">{panelGuide.contents}</h2>
          <ol>
            {panelGuide.sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>{section.title}</a>
              </li>
            ))}
          </ol>
        </nav>
        {panelGuide.sections.map((section) => (
          <section key={section.id} id={section.id} className="ta-guide__section">
            <h2>{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.id === 'partes' && (
              <p className="ta-guide__role">
                <strong>{panelGuide.yourRole((req.user as { role?: string | null }).role)}</strong>
              </p>
            )}
            {section.id === 'partes' && (
              <dl className="ta-guide__parts">
                {groups.map((group) => (
                  <div key={group.slug}>
                    <dt>
                      <Link href={`${adminRoute}/collections/${group.slug}`}>{group.label}</Link>
                    </dt>
                    <dd>{group.description}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        ))}
      </Gutter>
    </DefaultTemplate>
  )
}

/** El enlace a la guía al final del menú. */
export function PanelGuideNavLink({ payload }: ServerProps) {
  const href = `${payload.config.routes.admin}${PANEL_GUIDE_PATH}`
  return (
    <Link className="nav__link ta-guide-link" href={href}>
      <span className="nav__link-label">{panelGuide.navLink}</span>
    </Link>
  )
}

function labelText(label: unknown, fallback: string): string {
  if (typeof label === 'string') return label
  if (label && typeof label === 'object') {
    const values = label as Record<string, string>
    return values.es ?? Object.values(values)[0] ?? fallback
  }
  return fallback
}
