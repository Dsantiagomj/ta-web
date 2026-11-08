// Las cifras de los checklists de la portada. Aún viven en silvestre-checklist, que la app no
// importa (AGENTS.md, Related repo): se copiaron de allí el 2026-11-07 y cambian con él.
// - Silvestre y Hielos: la longitud de STEPS en src/dofus/silvestre/steps.js (100) y en
//   src/dofus/hielos/steps.js (70).
// - Ocre: las almas de public/cosecha/cosecha.json (337).
// Cuando los checklists lleguen a la app (fase 2a), salen de sus datos.

export const CHECKLIST_FIGURES = [
  { value: 100, unit: 'pasos' },
  { value: 70, unit: 'pasos' },
  { value: 337, unit: 'almas' },
] as const
