// Textos de los componentes de las páginas de guía. Un segundo idioma sería traducir
// este módulo.

import { formatAmount } from '@/lib/guides/display'

export const gameStrings = {
  levelValue: (level: number) => `Nivel ${level}`,
  quantity: (quantity: number, name: string) => `${formatAmount(quantity)} × ${name}`,
  quantityPrefix: (quantity: number) => `${formatAmount(quantity)} × `,
  quantitySuffix: (quantity: number) => `× ${formatAmount(quantity)}`,
  coordinates: {
    copyLabel: (coordinates: string, command: string) => `${coordinates}, copiar ${command}`,
    button: 'Copiar',
    copied: (command: string) => `Copiado: ${command}`,
    copyFailed: (command: string) => `Escribe ${command} en el chat`,
  },
  header: {
    /** Las partes del subtítulo, unidas con « - ». */
    zone: (zone: string) => `Misión de ${zone}`,
    level: (level: number) => `Nivel ${level}`,
    achievement: (position: number) => `Misión ${position} del logro`,
    separator: ' - ',
    giver: 'Empieza con ',
    prerequisites: 'Prerrequisitos',
    needs: 'Necesitarás',
    rewards: 'Recompensas',
    quantity: (quantity: number) => `${formatAmount(quantity)} ×`,
    kamas: 'kamas',
    xp: 'XP',
    /** «9 800 a 16 380 XP»: de la XP del nivel óptimo a la del tope. */
    xpRangeJoin: 'a',
    /** La bolsa con los objetos de la recompensa: «4 objetos», con la cifra aparte. */
    bagCount: (count: number) => (count === 1 ? 'objeto' : 'objetos'),
    bagList: 'Objetos de recompensa',
  },
  steps: {
    title: 'Pasos',
  },
  torre: {
    title: 'Recomendaciones de Torre',
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
