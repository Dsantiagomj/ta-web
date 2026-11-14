import type { CollectionConfig } from 'payload'

// La «Guía del panel» (A-14, src/components/admin/PanelGuide.tsx) y la línea que describe
// cada colección arriba de su lista. Escrito para Torre, de tú y con palabras sencillas.
// BORRADOR: Torre lo revisa antes de darlo por bueno (docs/research/backlog.md, A-14).

/** Dónde vive la guía, bajo la ruta del panel: /admin/guia (payload.config.ts). */
export const PANEL_GUIDE_PATH = '/guia'

/** Una línea por colección, arriba de su lista. La guía las repite en «Qué hay en cada parte». */
export const collectionDescriptions = {
  'quest-guides': 'Tus guías de misiones: una por misión, con sus pasos, combates y vídeo.',
  'achievement-pages':
    'Una página por logro: tu entrada, las misiones en orden y lo que necesitas en total.',
  'achievement-groups':
    'Los metalogros que agrupan logros en /metalogros. No tienen página propia: abren su panel.',
  'dofus-guides':
    'Una guía por Dofus: lo que pide, los logros y misiones que lo dan y su checklist.',
  checklists:
    'Las checklists paso a paso de cada Dofus. El progreso de cada visitante va por paso.',
  media: 'Todas las imágenes: las que subes tú y las del juego que trae DofusDB.',
  quests: 'Las misiones de DofusDB, con sus etapas y recompensas. Las eliges en tus guías.',
  items: 'Los objetos de DofusDB, con su icono. Los eliges en «Necesitarás» y en los Dofus.',
  monsters: 'Los monstruos de DofusDB, con su imagen. Los eliges en los bloques de combate.',
  dungeons: 'Las mazmorras de DofusDB y sus jefes. Las eliges en las notas de las guías.',
  npcs: 'Los PNJ de DofusDB que dan misiones o salen en ellas, con sus dibujos.',
  subareas: 'Las zonas de DofusDB, con su área. Dan el nombre de los sitios de cada misión.',
  'achievement-categories': 'Las categorías de logros de DofusDB, como «Astrub» o «Eventos».',
  achievements: 'Los logros de DofusDB. Cada página de logro enlaza uno.',
  users: 'Las cuentas que pueden entrar en este panel.',
} as const

/** Pone a cada colección su línea de `collectionDescriptions`. */
export function withPanelDescriptions(collections: CollectionConfig[]): CollectionConfig[] {
  return collections.map((collection) => {
    const description =
      collectionDescriptions[collection.slug as keyof typeof collectionDescriptions]
    return description ? { ...collection, admin: { ...collection.admin, description } } : collection
  })
}

export type GuideSection = { id: string; title: string; paragraphs: string[] }

export const panelGuide = {
  title: 'Guía del panel',
  navLink: 'Guía del panel',
  intro:
    'Lo básico para escribir y publicar sin miedo a romper nada. Si algo sale mal, ' +
    '«Versiones» lo deshace.',
  contents: 'En esta guía',
  sections: [
    {
      id: 'borradores',
      title: 'Borradores: guardar sin que se vea',
      paragraphs: [
        '«Guardar borrador» guarda lo que escribiste, pero la web sigue enseñando lo de antes. ' +
          'Guarda tantas veces como quieras.',
        'Una página nueva empieza como borrador: nadie la ve hasta que la publicas.',
        'En «Pendiente», la portada del panel, tienes la lista de borradores a medias.',
      ],
    },
    {
      id: 'publicar',
      title: 'Publicar: que salga en la web',
      paragraphs: [
        '«Publicar cambios» manda a la web lo que tienes en pantalla. Tarda unos segundos en ' +
          'verse.',
        'Arriba a la derecha, «En la web» te dice en una línea qué ve un visitante: «En la ' +
          'web: visible», «Tienes cambios sin publicar» o por qué no se ve.',
        'Para ver cómo queda antes de publicar, pulsa el botón del ojo: la vista previa enseña ' +
          'tu borrador como Móvil, Tableta o Escritorio. Solo la ves tú.',
      ],
    },
    {
      id: 'en-preparacion',
      title: '«Visible en la web» y «En preparación»',
      paragraphs: [
        'Los logros, los metalogros, las guías de Dofus y las checklists tienen además ' +
          '«Visible en la web».',
        'En preparación: sale en las listas de la web apagada, sin enlace y con la etiqueta ' +
          '«En preparación». Publicada: se abre.',
        'Para que una página se abra hacen falta las dos cosas: «Visible en la web» en ' +
          'Publicada y «Publicar cambios».',
      ],
    },
    {
      id: 'datos-del-juego',
      title: 'Datos del juego: vienen de DofusDB',
      paragraphs: [
        'Las misiones, los objetos, los monstruos, las mazmorras, los PNJ, las zonas y los ' +
          'logros vienen de DofusDB. No se escriben aquí: los eliges en los campos de tus guías.',
        'Por eso salen como «solo lectura». Se ponen al día con un proceso aparte, no desde el ' +
          'panel. Si ves un dato del juego mal, avisa a quien lleva la parte técnica.',
        'En los logros, lo que dejes vacío se rellena con DofusDB al guardar, y lo que escribas ' +
          'tú no lo pisa nadie. La nota bajo cada campo te dice de dónde viene.',
      ],
    },
    {
      id: 'imagenes',
      title: 'Imágenes',
      paragraphs: [
        'Sube una imagen desde «Imágenes» o directamente en el campo de una guía. Sube el ' +
          'original: la web hace sola las versiones pequeñas y ligeras.',
        'Escribe siempre el texto alternativo: describe lo que se ve, para quien no puede ver ' +
          'la imagen y para Google. Sin «imagen de…».',
        'Los iconos de objetos y los dibujos de monstruos y PNJ ya los trae DofusDB: no hace ' +
          'falta subirlos.',
      ],
    },
    {
      id: 'versiones',
      title: 'Versiones: tu botón de deshacer',
      paragraphs: [
        'Cada vez que guardas o publicas, el panel guarda una copia. Las ves en la pestaña ' +
          '«Versiones» de cada página: las 50 últimas.',
        'Para volver atrás, abre una versión antigua y pulsa «Restaurar esta versión». Después ' +
          'publica si quieres que salga en la web.',
        '«Revertir a la versión publicada», junto al estado de arriba, tira los cambios sin ' +
          'publicar y vuelve a lo que está en la web.',
      ],
    },
    {
      id: 'direccion',
      title: 'La dirección en la web',
      paragraphs: [
        '«Dirección en la web» es el final del enlace: torrentearcano.com/aprendizaje-escudero. ' +
          'Solo minúsculas sin tildes, cifras y guiones.',
        'En una página ya publicada, mejor no cambiarla: los enlaces que la gente guardó dejarían ' +
          'de funcionar.',
      ],
    },
    {
      id: 'partes',
      title: 'Qué hay en cada parte',
      paragraphs: [
        'El menú de la izquierda pone primero tu contenido, luego las imágenes, los datos del ' +
          'juego y los ajustes. Cada lista empieza con una línea que dice qué guarda.',
      ],
    },
  ] satisfies GuideSection[],
} as const
