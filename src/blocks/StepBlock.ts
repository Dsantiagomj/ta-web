import type { Block } from 'payload'

import { guideStrings } from '../lib/guides/strings'
import { CalloutBlock } from './CalloutBlock'
import { FightBlock } from './FightBlock'
import { ImageBlock } from './ImageBlock'
import { RichTextBlock } from './RichTextBlock'
import { VideoBlock } from './VideoBlock'

const s = guideStrings.admin.step

type CoordinateOptions = { siblingData: { x?: unknown; y?: unknown } }

/**
 * X e Y van juntas o no van: el chip del paso necesita las dos. Enteras, como las del
 * juego. Devuelve true o el mensaje de error, como espera Payload.
 */
export function validateStepCoordinate(
  value: number | null | undefined,
  { siblingData }: CoordinateOptions,
): true | string {
  if (value != null) return Number.isInteger(value) ? true : s.coordinatesInteger
  // El error va en la que falta, no en la que está bien.
  return siblingData?.x != null || siblingData?.y != null ? s.coordinatesPair : true
}

// Un paso de la guía (DESIGN.md, Steps): la posición principal si la tiene y su propio
// contenido. La página pinta los pasos seguidos, separados por una línea.
export const StepBlock: Block = {
  slug: 'step',
  interfaceName: 'StepBlock',
  labels: { singular: s.singular, plural: s.plural },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'x',
          label: s.x,
          type: 'number',
          validate: validateStepCoordinate,
          admin: { width: '50%', description: s.coordinatesDescription },
        },
        {
          name: 'y',
          label: s.y,
          type: 'number',
          validate: validateStepCoordinate,
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'body',
      label: s.body,
      labels: { singular: 'Bloque', plural: 'Bloques' },
      type: 'blocks',
      blocks: [RichTextBlock, ImageBlock, VideoBlock, CalloutBlock, FightBlock],
    },
  ],
}
