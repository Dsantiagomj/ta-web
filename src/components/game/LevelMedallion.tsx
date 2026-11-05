import { gameStrings } from './strings'

/** El nivel de la misión en un círculo con aro en --color-accent-2 (DESIGN.md, Level medallion). */
export function LevelMedallion({ level }: { level: number }) {
  return (
    <p className="grid size-[76px] shrink-0 content-center justify-items-center gap-1 rounded-pill border-2 border-accent-2 bg-surface/92 md:size-[104px]">
      <span className="font-display text-micro text-ink-2 uppercase">{gameStrings.level}</span>
      <span className="font-accent text-[1.75rem] leading-none text-accent-2 md:text-figure-lg">
        {level}
      </span>
    </p>
  )
}
