// Datos públicos del juego: cualquiera los lee. Nadie los cambia por la API ni el panel;
// el script de refresco escribe con la API local y overrideAccess: true.
export const gameDataAccess = {
  read: () => true,
  create: () => false,
  update: () => false,
  delete: () => false,
}
