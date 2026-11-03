import { homeStrings as s } from './strings'

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-(--width-page) flex-col justify-center gap-6 px-4 py-16 sm:px-6 lg:px-12">
      <p className="font-display text-eyebrow text-accent uppercase">{s.eyebrow}</p>
      <h1 className="font-display text-hero text-ink uppercase">{s.title}</h1>
      <p className="max-w-[60ch] text-lg text-ink-2">{s.lead}</p>
      <p className="max-w-[60ch] text-ink-2">
        {s.body} <a href="https://www.torrentearcano.com">{s.linkLabel}</a>.
      </p>
      <div className="mt-4 inline-flex w-fit items-center gap-4 rounded-card bg-surface px-5 py-4">
        <span className="font-display text-micro text-muted uppercase">{s.phaseLabel}</span>
        <span className="font-display text-figure-lg text-accent-2 uppercase">{s.phaseValue}</span>
      </div>
    </main>
  )
}
