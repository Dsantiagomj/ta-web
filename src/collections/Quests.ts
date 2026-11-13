import type { CollectionConfig, Field } from 'payload'

import { gameDataAccess } from './game-data-access'

export const questsAccess = gameDataAccess

/** Una lista de filas { <relación>, cantidad }, para objetos y monstruos. */
function quantities(name: string, label: string, relation: 'item' | 'monster'): Field {
  return {
    name,
    label,
    type: 'array',
    fields: [
      {
        name: relation,
        label: relation === 'item' ? 'Objeto' : 'Monstruo',
        type: 'relationship',
        relationTo: relation === 'item' ? 'items' : 'monsters',
        required: true,
      },
      { name: 'quantity', label: 'Cantidad', type: 'number', required: true },
    ],
  }
}

// Listas de IDs de DofusDB: un número con hasMany se valida y se tipa como number[].
function dofusIds(name: string, label: string): Field {
  return { name, label, type: 'number', hasMany: true }
}

// Misiones de DofusDB. Torre las elige desde las guías con campos de relación.
export const Quests: CollectionConfig = {
  slug: 'quests',
  labels: { singular: 'Misión de DofusDB', plural: 'Misiones de DofusDB' },
  admin: {
    useAsTitle: 'name',
    group: 'Datos del juego',
    defaultColumns: ['name', 'dofusId', 'levelMin'],
    description: 'Datos de DofusDB, de solo lectura. Los actualiza un script.',
  },
  access: questsAccess,
  fields: [
    {
      name: 'dofusId',
      label: 'ID en DofusDB',
      type: 'number',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'name',
      label: 'Nombre',
      type: 'text',
      required: true,
      localized: true,
    },
    { name: 'levelMin', label: 'Nivel mínimo', type: 'number' },
    { name: 'levelMax', label: 'Nivel máximo', type: 'number' },
    { name: 'categoryId', label: 'ID de categoría en DofusDB', type: 'number' },
    {
      name: 'startCriterion',
      label: 'Criterio de inicio',
      type: 'text',
      admin: {
        // Se guarda tal cual para calcular datos derivados más adelante.
        description: 'Criterio en bruto de DofusDB, como Ps=1&Pa=1&PL>29&Qf=55.',
      },
    },
    {
      name: 'prerequisites',
      label: 'Prerrequisitos',
      type: 'relationship',
      relationTo: 'quests',
      hasMany: true,
      admin: {
        description: 'Misiones que hay que terminar antes.',
      },
    },
    {
      // DofusDB puede dar varias, por ejemplo una por clase.
      name: 'startPositions',
      label: 'Posiciones de inicio',
      type: 'array',
      fields: [
        { name: 'npcId', label: 'ID del PNJ', type: 'number' },
        { name: 'npcName', label: 'Nombre del PNJ', type: 'text', localized: true },
        { name: 'mapId', label: 'ID del mapa', type: 'number' },
        { name: 'x', label: 'X', type: 'number' },
        { name: 'y', label: 'Y', type: 'number' },
      ],
    },
    {
      name: 'zone',
      label: 'Zona',
      type: 'text',
      localized: true,
      admin: { description: 'El área del mapa de inicio, como Astrub.' },
    },
    {
      name: 'achievement',
      label: 'Logro',
      type: 'group',
      admin: { description: 'El logro de la misión y su posición en él.' },
      fields: [
        { name: 'dofusId', label: 'ID en DofusDB', type: 'number' },
        { name: 'name', label: 'Nombre', type: 'text', localized: true },
        { name: 'slug', label: 'Slug', type: 'text' },
        { name: 'position', label: 'Posición', type: 'number' },
        { name: 'total', label: 'Misiones del logro', type: 'number' },
      ],
    },
    {
      name: 'rewards',
      label: 'Recompensas',
      type: 'group',
      admin: {
        description: 'Para un personaje de nivel 200, como en las guías de Torre y en dofusdb.fr.',
      },
      fields: [
        { name: 'experience', label: 'Experiencia', type: 'number' },
        {
          name: 'experienceMin',
          label: 'Experiencia en el nivel óptimo',
          type: 'number',
          admin: { description: 'El principio del rango de XP que enseña la guía.' },
        },
        { name: 'kamas', label: 'Kamas', type: 'number' },
        quantities('items', 'Objetos', 'item'),
        dofusIds('emoteIds', 'IDs de emotes'),
        dofusIds('spellIds', 'IDs de hechizos'),
        dofusIds('titleIds', 'IDs de títulos'),
        dofusIds('jobIds', 'IDs de oficios'),
      ],
    },
    {
      name: 'needs',
      label: 'Necesitarás',
      type: 'group',
      admin: {
        description: 'Sacado de need.items y de los objetivos de las etapas en DofusDB.',
      },
      fields: [
        quantities('items', 'Objetos', 'item'),
        quantities('monsters', 'Monstruos', 'monster'),
        {
          name: 'walksMaps',
          label: 'Caminar mapas',
          type: 'checkbox',
          admin: { description: 'Algún objetivo pide descubrir un mapa o una zona.' },
        },
      ],
    },
    {
      name: 'stages',
      label: 'Etapas',
      type: 'array',
      admin: {
        readOnly: true,
        description:
          'Las etapas de DofusDB con sus objetivos, en el orden del checklist. El progreso de una misión cuenta objetivos en este orden.',
      },
      fields: [
        { name: 'dofusId', label: 'ID en DofusDB', type: 'number', required: true },
        { name: 'name', label: 'Nombre', type: 'text', localized: true },
        {
          name: 'objectives',
          label: 'Objetivos',
          type: 'array',
          fields: [
            { name: 'dofusId', label: 'ID en DofusDB', type: 'number', required: true },
            {
              name: 'kind',
              label: 'Tipo',
              type: 'select',
              required: true,
              options: [
                { label: 'Libre', value: 'free' },
                { label: 'Hablar con un PNJ', value: 'npc' },
                { label: 'Entregar', value: 'bring' },
                { label: 'Pelear', value: 'fight' },
                { label: 'Descubrir un mapa o una zona', value: 'map' },
                { label: 'Fabricar', value: 'craft' },
              ],
            },
            {
              name: 'text',
              label: 'Texto',
              type: 'text',
              localized: true,
              admin: {
                description: 'Tal cual lo da DofusDB, con marcas como {npc,2646} sin resolver.',
              },
            },
            { name: 'npcId', label: 'ID del PNJ', type: 'number' },
            { name: 'monsterId', label: 'ID del monstruo', type: 'number' },
            { name: 'itemId', label: 'ID del objeto', type: 'number' },
            { name: 'quantity', label: 'Cantidad', type: 'number' },
            { name: 'mapId', label: 'ID del mapa', type: 'number' },
            { name: 'x', label: 'X', type: 'number' },
            { name: 'y', label: 'Y', type: 'number' },
            { name: 'subAreaId', label: 'ID de la subzona', type: 'number' },
          ],
        },
      ],
    },
    {
      name: 'refreshedAt',
      label: 'Actualizada el',
      type: 'date',
      admin: {
        description: 'La pone el script de refresco.',
      },
    },
  ],
}
