// Los textos de las guías de Dofus en el panel. Un segundo idioma sería traducir este módulo.

export const dofusGuideStrings = {
  tags: {
    primordial: 'Primordial',
    event: 'Evento',
  },
  admin: {
    dofusDescription:
      'El objeto Dofus de DofusDB: de él sale el huevo de la tarjeta, del menú y de la página.',
    nameDescription: 'El nombre del Dofus, como sale en la tarjeta y en el título de la página.',
    slugDescription: 'La URL de la guía, la misma que en la web de Torre: dofus-abisal.',
    orderDescription: 'Su lugar en la lista de guías: el 1 sale primero.',
    levelDescription: 'El nivel del Dofus en DofusDB.',
    tagDescription: 'Los filtros del índice. Vacío si no es primordial ni de evento.',
    colorDescription: 'El brillo detrás del huevo, en hexadecimal (#2a5aaa).',
    colorInvalid: 'Tiene que ser un color hexadecimal de seis cifras: #2a5aaa',
    aliasesDescription:
      'Otros nombres con los que se busca, separados por comas (zanahoria, kaliptus).',
    needsDescription:
      'Lo que pide el Dofus, por grupos. Un objeto enlazado sale con su icono y se copia de un clic.',
    needsTitleDescription: 'Vacío: «Necesitarás».',
    needItemNameDescription:
      'El nombre si el objeto no está enlazado. Enlazado, sale el nombre del objeto.',
    needItemNameRequired: 'Enlaza el objeto o escribe su nombre',
    partsDescription:
      'Los logros y las misiones en el orden en que se hacen. Las misiones de cada logro ' +
      'salen de su página de logro: se cambian allí.',
    noteDescription: 'Una nota corta junto al nombre, como «(solo empezarla)».',
    bodyDescription: 'Para las guías paso a paso, como la Piñata de pino.',
    videoDescription: 'Enlace al vídeo de la guía en YouTube (youtube.com o youtu.be).',
    videoPosterDescription:
      'La imagen que se ve antes de reproducir el vídeo. La importación trae la de YouTube.',
    checklistDescription: 'La checklist de este Dofus, si tiene: sale como tarjeta en la guía.',
  },
} as const
