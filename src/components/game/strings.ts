// Textos de los componentes de las páginas de guía. Un segundo idioma sería traducir
// este módulo.

import { formatAmount } from '@/lib/guides/display'

export const gameStrings = {
  level: 'Nivel',
  levelValue: (level: number) => `Nivel ${level}`,
  breadcrumb: 'Migas de pan',
  quantity: (quantity: number, name: string) => `${formatAmount(quantity)} × ${name}`,
  quantityPrefix: (quantity: number) => `${formatAmount(quantity)} × `,
  quantitySuffix: (quantity: number) => `× ${formatAmount(quantity)}`,
  coordinates: {
    copyLabel: (coordinates: string, command: string) => `${coordinates}, copiar ${command}`,
    button: 'Copiar',
    copied: (command: string) => `Copiado: ${command}`,
    copyFailed: (command: string) => `Escribe ${command} en el chat`,
  },
  ribbon: {
    label: 'Antes de empezar',
    start: 'Empieza',
    requires: 'Requiere',
    needs: 'Necesitarás',
    reward: 'Recompensa',
    rewardSummary: ({ xp, kamas, items }: { xp?: number; kamas?: number; items?: number }) =>
      [
        xp ? `${formatAmount(xp)} XP` : null,
        kamas ? `${formatAmount(kamas)} kamas` : null,
        items ? `${items} ${items === 1 ? 'objeto' : 'objetos'}` : null,
      ]
        .filter(Boolean)
        .join(' · '),
  },
  stages: {
    title: 'Etapas',
    hint: 'Marca cada etapa al terminarla. Por ahora no se guarda al salir.',
    done: (number: number) => `Etapa ${number} hecha`,
    progress: 'Etapas',
  },
  botin: {
    eyebrow: 'Al terminar la misión',
    title: 'Botín',
    xp: 'XP',
    kamas: 'Kamas',
  },
  chain: {
    label: 'Cadena del logro',
    achievement: 'Logro',
    position: (position: number, total: number) => `misión ${position} de ${total}:`,
    gap: '…',
  },
  video: {
    watch: (title: string) => `Ver el vídeo: ${title}`,
    source: 'YouTube, Torrente Arcano',
  },
}
