import { buttonClass } from '@/components/ui/Button'
import { formatCoordinates, splitCoordinates, travelCommand } from '@/lib/guides/coordinates'

import './game.css'
import { CopyIcon, PinIcon } from './icons'
import { gameStrings } from './strings'

const s = gameStrings.coordinates

/**
 * Chip de coordenadas (DESIGN.md, Coordinates chip): una chincheta y [x,y]; copia /travel x,y.
 * Sin JavaScript es texto que se puede leer y seleccionar; PageEnhancements lo convierte
 * en botón y le da el nombre de data-copy-label.
 */
export function CoordinatesChip({ x, y }: { x: number; y: number }) {
  const label = formatCoordinates({ x, y })
  const command = travelCommand({ x, y })
  return (
    <span className="coord" data-copy={command} data-copy-label={s.copyLabel(label, command)}>
      <PinIcon className="size-4" />
      {label}
    </span>
  )
}

/** Un texto de la prosa con cada [x,y] convertido en chip. */
export function CoordinatesText({ children }: { children: string }) {
  return splitCoordinates(children).map((part, index) =>
    typeof part === 'string' ? part : <CoordinatesChip key={index} {...part} />,
  )
}

/** El botón primario de Empieza: copia el /travel de la posición de inicio. */
export function TravelButton({ x, y }: { x: number; y: number }) {
  const command = travelCommand({ x, y })
  return (
    <span data-copy={command} className={buttonClass({ variant: 'primary', compact: true })}>
      <CopyIcon />
      <span>
        {s.button}{' '}
        <span className="font-body tracking-normal normal-case tabular-nums">{command}</span>
      </span>
    </span>
  )
}
