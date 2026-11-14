'use client'

import { useConfig } from '@payloadcms/ui'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { PANEL_GUIDE_PATH } from '@/lib/admin/panel-guide'
import { panelStrings } from '@/lib/admin/strings'

/** El enlace a la guía al final del menú, marcado como los de Payload cuando estás en ella. */
export function PanelGuideNavLink() {
  const {
    config: {
      routes: { admin },
    },
  } = useConfig()
  const href = `${admin}${PANEL_GUIDE_PATH}`
  const active = usePathname() === href
  return (
    <Link
      className="nav__link ta-guide-link"
      href={href}
      prefetch={false}
      aria-current={active ? 'page' : undefined}
    >
      {active && <div className="nav__link-indicator" />}
      <span className="nav__link-label">{panelStrings.guide.title}</span>
    </Link>
  )
}
