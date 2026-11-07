// Iconos de interfaz dibujados a mano solo donde no hay arte del juego que encaje: copiar,
// la chincheta de las coordenadas, la marca de hecho, cerrar y el chevrón de la bolsa.
// Decorativos siempre.

export function PinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <path
        fill="currentColor"
        d="M8 1.2a5 5 0 0 0-5 5c0 3.6 5 8.6 5 8.6s5-5 5-8.6a5 5 0 0 0-5-5zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"
      />
    </svg>
  )
}

export function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className={className}
    >
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
      <path d="M3 10.5v-7a1 1 0 0 1 1-1h6.5" />
    </svg>
  )
}

export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  )
}

export function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
    >
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  )
}

export function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  )
}
