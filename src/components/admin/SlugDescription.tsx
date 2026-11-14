'use client'

import { useFormFields } from '@payloadcms/ui'
import type { FieldDescriptionClientProps } from 'payload'

import { slugProblem } from '@/lib/admin/slug'
import { type AddressKind, pageAddress, panelStrings } from '@/lib/admin/strings'

type Props = FieldDescriptionClientProps & { help: string; address?: AddressKind }

/**
 * Bajo «Dirección en la web»: la ayuda del campo y la dirección completa, en vivo. Una
 * dirección que no se va a poder guardar no se enseña: sale el mensaje que daría al guardar.
 */
export function SlugDescription({ path, help, address: kind = 'page' }: Props) {
  const slug = useFormFields(([fields]) => fields[path]?.value)
  const value = typeof slug === 'string' ? slug : null
  const problem = slugProblem(value, kind)
  const address = problem ? null : pageAddress(value, kind)
  return (
    <div className="field-description field-note ta-slug-description">
      {help}
      <span className="ta-address">
        {problem ??
          (address ? (
            <>
              {panelStrings.slug.preview} <strong>{address}</strong>
            </>
          ) : (
            panelStrings.slug.empty
          ))}
      </span>
    </div>
  )
}
