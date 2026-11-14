/** Los componentes de src/components/admin/RowLabels.tsx que puede usar una fila. */
export type RowLabelComponent =
  'ChecklistStepLabel' | 'SegmentLabel' | 'TextRowLabel' | 'RelationRowLabel' | 'NeedGroupLabel'

/**
 * La etiqueta de las filas de un array en el panel (`admin.components`): Torre encuentra
 * una fila por su texto, no por «Paso 17». Se mezcla con los demás componentes del campo:
 * `components: { ...rowLabel('TextRowLabel', { … }) }`.
 */
export function rowLabel(name: RowLabelComponent, clientProps?: Record<string, string>) {
  return {
    RowLabel: {
      path: `/components/admin/RowLabels#${name}`,
      ...(clientProps ? { clientProps } : {}),
    },
  }
}
