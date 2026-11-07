import { DEFAULT_MODE, MODE_COOKIE, MODE_COOKIE_ATTRIBUTES } from './theme'

// Script inline del <head>: fija data-mode antes del primer pintado. El servidor ya
// pinta el modo de la cookie; esto cubre la visita sin cookie pero con el modo en
// localStorage, y vuelve a escribir la cookie para la siguiente petición.
// Solo toca el modo, nunca el tema. También marca data-js: hay JavaScript, así que la
// bolsa de recompensas de la guía empieza cerrada desde el primer pintado (sin él, su lista
// se ve abierta).
export const modeScript = `(function () {
  var d = document.documentElement;
  d.setAttribute('data-js', '');
  var m = document.cookie.match(/(?:^|; )${MODE_COOKIE}=(dark|light)(?:;|$)/);
  var mode = m ? m[1] : null;
  if (!mode) {
    try {
      var stored = localStorage.getItem('${MODE_COOKIE}');
      if (stored === 'dark' || stored === 'light') {
        mode = stored;
        document.cookie = '${MODE_COOKIE}=' + mode + '; ${MODE_COOKIE_ATTRIBUTES}';
      }
    } catch (e) {}
  }
  d.setAttribute('data-mode', mode || '${DEFAULT_MODE}');
})();`
