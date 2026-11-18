import type { CollectionConfig } from 'payload'

import { panelStrings } from '../lib/admin/strings'
import { withTorreCorrection } from './torre-correction'

// Logros de DofusDB de las categorías de misiones y eventos. Las páginas de logro de Torre
// apuntan a uno y copian lo que necesitan, que Torre puede cambiar (como las guías con
// quests). Las cifras de las recompensas son las de un personaje de nivel 200.
export const Achievements: CollectionConfig = withTorreCorrection(
  {
    slug: 'achievements',
    labels: { singular: 'Logro de DofusDB', plural: 'Logros de DofusDB' },
    admin: {
      useAsTitle: 'name',
      group: panelStrings.groups.gameData,
      hideAPIURL: true,
      defaultColumns: ['name', 'dofusId', 'category', 'points'],
    },
    fields: [
      {
        name: 'dofusId',
        label: 'ID en DofusDB',
        type: 'number',
        required: true,
        unique: true,
        index: true,
      },
      { name: 'name', label: 'Nombre', type: 'text', required: true, localized: true },
      { name: 'icon', label: 'Icono', type: 'upload', relationTo: 'media' },
      { name: 'points', label: 'Puntos', type: 'number' },
      { name: 'level', label: 'Nivel', type: 'number' },
      { name: 'order', label: 'Orden en su categoría', type: 'number' },
      {
        name: 'category',
        label: 'Categoría',
        type: 'relationship',
        relationTo: 'achievement-categories',
      },
      {
        name: 'quests',
        label: 'Misiones',
        labels: { singular: 'Misión', plural: 'Misiones' },
        type: 'array',
        admin: {
          description:
            'Los objetivos del logro, en orden. Varias misiones en una fila son alternativas: ' +
            'se hace una (la misión de clase).',
        },
        fields: [
          { name: 'name', label: 'Objetivo', type: 'text', localized: true },
          {
            name: 'quests',
            label: 'Misiones',
            type: 'relationship',
            relationTo: 'quests',
            hasMany: true,
          },
        ],
      },
      {
        name: 'description',
        label: 'Descripción',
        type: 'textarea',
        localized: true,
        admin: { description: 'Lo que pide el logro en el juego, como lo dice DofusDB.' },
      },
      {
        name: 'objectives',
        label: 'Objetivos',
        labels: { singular: 'Objetivo', plural: 'Objetivos' },
        type: 'array',
        admin: {
          description:
            'Todos los objetivos del logro, en orden, también los que no son misiones ' +
            '(«Alineamiento 10», «Nivel 30»). La página de un logro sin misiones los enseña.',
        },
        fields: [{ name: 'name', label: 'Objetivo', type: 'text', localized: true }],
      },
      {
        name: 'rewards',
        label: 'Recompensas',
        type: 'group',
        admin: { description: 'Para un personaje de nivel 200, como en las páginas de Torre.' },
        fields: [
          { name: 'experience', label: 'Experiencia', type: 'number' },
          { name: 'kamas', label: 'Kamas', type: 'number' },
          {
            name: 'items',
            label: 'Objetos',
            labels: { singular: 'Objeto', plural: 'Objetos' },
            type: 'array',
            fields: [
              {
                name: 'item',
                label: 'Objeto',
                type: 'relationship',
                relationTo: 'items',
                required: true,
              },
              { name: 'quantity', label: 'Cantidad', type: 'number', required: true },
            ],
          },
        ],
      },
      {
        name: 'countsFor',
        label: 'Cuenta para',
        labels: { singular: 'Logro que lo pide', plural: 'Logros que lo piden' },
        type: 'array',
        admin: {
          description: 'Los logros del juego que lo piden, directamente o a través de otro.',
        },
        fields: [
          { name: 'dofusId', label: 'ID en DofusDB', type: 'number' },
          { name: 'name', label: 'Nombre', type: 'text', localized: true },
          { name: 'points', label: 'Puntos', type: 'number' },
          { name: 'achievements', label: 'Logros que pide', type: 'number' },
          { name: 'icon', label: 'Icono', type: 'upload', relationTo: 'media' },
        ],
      },
      {
        name: 'refreshedAt',
        label: 'Actualizado el',
        type: 'date',
        admin: { description: 'La pone el script de refresco.' },
      },
    ],
  },
  { level: true, image: true },
)
