import {
  DEFAULT_MODE,
  FREE_THEMES,
  MODE_COOKIE,
  MODE_COOKIE_ATTRIBUTES,
  THEME_COOKIE,
} from './theme'

// Solo los temas gratis: el Ocre premium nunca sale de una cookie ni de localStorage.
const freeThemes = FREE_THEMES.join('|')

// Script inline del <head>: fija data-mode y data-theme antes del primer pintado. El
// servidor ya pinta los dos desde sus cookies; esto cubre la visita sin cookie pero con el
// valor en localStorage, y vuelve a escribir la cookie para la siguiente petición. Un tema
// desconocido o premium no se toca: se queda el que pintó el servidor (Amakna).
// También marca data-js: hay JavaScript, así que la bolsa de recompensas de la guía empieza
// cerrada desde el primer pintado (sin él, su lista se ve abierta).
export const modeScript = `(function () {
  var d = document.documentElement;
  d.setAttribute('data-js', '');
  function pick(name, pattern) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=(' + pattern + ')(?:;|$)'));
    if (m) return m[1];
    try {
      var stored = localStorage.getItem(name);
      if (stored && new RegExp('^(' + pattern + ')$').test(stored)) {
        document.cookie = name + '=' + stored + '; ${MODE_COOKIE_ATTRIBUTES}';
        return stored;
      }
    } catch (e) {}
    return null;
  }
  d.setAttribute('data-mode', pick('${MODE_COOKIE}', 'dark|light') || '${DEFAULT_MODE}');
  var theme = pick('${THEME_COOKIE}', '${freeThemes}');
  if (theme) d.setAttribute('data-theme', theme);
})();`
