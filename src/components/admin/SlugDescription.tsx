'use client'

import { useFormFields } from '@payloadcms/ui'
import type { FieldDescriptionClientProps } from 'payload'

import { type AddressKind, pageAddress, panelStrings } from '@/lib/admin/strings'

type Props = FieldDescriptionClientProps & { help: string; address?: AddressKind }

/** Bajo «Dirección en la web»: la ayuda del campo y la dirección completa, en vivo. */
export function SlugDescription({ path, help, address: kind = 'page' }: Props) {
  const slug = useFormFields(([fields]) => fields[path]?.value)
  const address = pageAddress(typeof slug === 'string' ? slug : null, kind)
  return (
    <div className="field-description field-note ta-slug-description">
      {help}
      <span className="ta-address">
        {address ? (
          <>
            {panelStrings.slug.preview} <strong>{address}</strong>
          </>
        ) : (
          panelStrings.slug.empty
        )}
      </span>
    </div>
  )
}
