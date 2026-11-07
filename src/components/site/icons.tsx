// Iconos de interfaz de la cabecera y el pie, decorativos siempre: el texto o el
// aria-label de su botón da el nombre. Los de las redes son trazos propios, no los logos
// oficiales.

import type { SocialKey } from './nav'

type IconProps = { className?: string }

function Svg({
  viewBox,
  className,
  children,
}: IconProps & { viewBox: string; children: React.ReactNode }) {
  return (
    <svg viewBox={viewBox} aria-hidden="true" focusable="false" className={className}>
      {children}
    </svg>
  )
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

export const SearchIcon = ({ className }: IconProps) => (
  <Svg viewBox="0 0 16 16" className={className}>
    <g {...stroke} strokeWidth="1.8">
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L14 14" />
    </g>
  </Svg>
)

export const MenuIcon = ({ className }: IconProps) => (
  <Svg viewBox="0 0 18 18" className={className}>
    <path {...stroke} strokeWidth="1.8" d="M3 5h12M3 9h12M3 13h12" />
  </Svg>
)

export const CloseIcon = ({ className }: IconProps) => (
  <Svg viewBox="0 0 18 18" className={className}>
    <path {...stroke} strokeWidth="1.8" d="M4.5 4.5l9 9M13.5 4.5l-9 9" />
  </Svg>
)

export const ChevronIcon = ({ className }: IconProps) => (
  <Svg viewBox="0 0 16 16" className={className}>
    <path {...stroke} strokeWidth="2" d="M4 6l4 4 4-4" />
  </Svg>
)

export const ArrowIcon = ({ className }: IconProps) => (
  <Svg viewBox="0 0 16 16" className={className}>
    <path {...stroke} strokeWidth="2" d="M3 8h9M8.5 4l4 4-4 4" />
  </Svg>
)

export const UpIcon = ({ className }: IconProps) => (
  <Svg viewBox="0 0 16 16" className={className}>
    <path {...stroke} strokeWidth="2" d="M8 13V4M4 7.5l4-4 4 4" />
  </Svg>
)

/** La puerta de las mazmorras que aún no tienen el arte de su jefe. */
export const DoorIcon = ({ className }: IconProps) => (
  <Svg viewBox="0 0 20 20" className={className}>
    <g {...stroke} strokeWidth="1.7">
      <path d="M4.5 17.5V8a5.5 5.5 0 0 1 11 0v9.5z" />
      <path d="M2.5 17.5h15M10 3v14.5" />
    </g>
    <circle cx="8.2" cy="11.5" r=".9" fill="currentColor" />
    <circle cx="11.8" cy="11.5" r=".9" fill="currentColor" />
  </Svg>
)

const SOCIAL_PATHS: Record<SocialKey | 'kofi', string> = {
  twitch:
    'M5 2 3 6v14h5v3h3l3-3h4l4-4V2H5zm15 13-3 3h-4l-3 3v-3H6V4h14v11zM15 7h2v5h-2V7zm-5 0h2v5h-2V7z',
  kick: 'M3 3h6v5h2V5h2V3h6v6h-2v2h-2v2h2v2h2v6h-6v-2h-2v-3H9v5H3V3z',
  youtube:
    'M22.5 7.2a3 3 0 0 0-2.1-2.1C18.5 4.6 12 4.6 12 4.6s-6.5 0-8.4.5A3 3 0 0 0 1.5 7.2 31 31 0 0 0 1 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.4.5 8.4.5s6.5 0 8.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 23 12a31 31 0 0 0-.5-4.8zM9.8 15.1V8.9l5.4 3.1-5.4 3.1z',
  discord:
    'M19.5 5.4A16.5 16.5 0 0 0 15.4 4l-.5 1a15 15 0 0 0-5.8 0l-.5-1a16.5 16.5 0 0 0-4.1 1.4C1.9 9.3 1.2 13.1 1.5 16.8a16.6 16.6 0 0 0 5 2.6l1.1-1.7a10.7 10.7 0 0 1-1.7-.8l.4-.3a11.8 11.8 0 0 0 11.4 0l.4.3c-.5.3-1.1.6-1.7.8l1.1 1.7a16.6 16.6 0 0 0 5-2.6c.4-4.3-.6-8-3-11.4zM8.5 14.5c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2zm7 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2z',
  kofi: 'M3 6h14v6.5A5.5 5.5 0 0 1 11.5 18h-3A5.5 5.5 0 0 1 3 12.5V6zm14 1.5h1.2a3 3 0 0 1 0 6H17v-2h1.2a1 1 0 0 0 0-2H17v-2zM10 9.2c-.8-.9-2.4-.6-2.4.8 0 1.2 1.4 2 2.4 2.8 1-.8 2.4-1.6 2.4-2.8 0-1.4-1.6-1.7-2.4-.8zM2 20h16v1.6H2z',
}

export const SocialIcon = ({ name, className }: IconProps & { name: SocialKey | 'kofi' }) => (
  <Svg viewBox="0 0 24 24" className={className}>
    <path fill="currentColor" d={SOCIAL_PATHS[name]} />
  </Svg>
)
