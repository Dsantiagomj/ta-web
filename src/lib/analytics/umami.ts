import { isDevEnvironment } from '@/lib/dev-gate/dev-gate'

type Env = Record<string, string | undefined>

export type UmamiConfig = { host: string; websiteId: string }

// Umami da a cada web un UUID. Solo eso entra en el script: nunca texto libre del entorno.
const WEBSITE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * La analítica sin cookies (backlog S-18): Umami propio, configurado con UMAMI_HOST (la URL
 * de Umami) y UMAMI_WEBSITE_ID (el ID de la web en Umami). Sin una de las dos, o con un
 * valor que no sirve, está apagada. En el entorno dev nunca se activa, para no mezclar las
 * visitas de prueba con las de verdad.
 */
export function umamiConfig(env: Env): UmamiConfig | null {
  if (isDevEnvironment(env)) return null
  const websiteId = env.UMAMI_WEBSITE_ID?.trim() ?? ''
  if (!WEBSITE_ID.test(websiteId)) return null
  let url: URL
  try {
    url = new URL(env.UMAMI_HOST?.trim() ?? '')
  } catch {
    return null
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null
  return { host: `${url.origin}${url.pathname}`.replace(/\/+$/, ''), websiteId }
}

/**
 * Script inline del <head> que cuenta las visitas. En vez del script.js de Umami (otra
 * petición y varios KB más, en páginas al límite de los 150 KB), envía lo mismo que él a
 * `POST {host}/api/send` con fetch: al terminar de cargar la página y en cada cambio de ruta
 * del App Router (pushState, replaceState y la vuelta atrás), una vez por ruta. Manda solo
 * la ruta, sin consulta ni ancla, y sin cookies (credentials: 'omit'). Espera 300 ms tras
 * cada cambio para leer el título de la página nueva, como el script de Umami. Un fallo de
 * red se ignora.
 */
export function umamiScript(config: UmamiConfig): string {
  // JSON sin «<»: un valor nunca puede cerrar la etiqueta <script>.
  const data = JSON.stringify({ h: config.host, w: config.websiteId }).replace(/</g, '\\u003c')
  return `(function(c){var d=document,l=location,h=history,r=d.referrer,last,ready;function check(){var u=l.pathname,from;if(!ready||u===last)return;if(last)r=l.origin+last;from=r;last=u;setTimeout(function(){fetch(c.h+'/api/send',{method:'POST',keepalive:true,credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'event',payload:{website:c.w,hostname:l.hostname,language:navigator.language,referrer:from,screen:screen.width+'x'+screen.height,title:d.title,url:u}})}).catch(function(){})},300)}['pushState','replaceState'].forEach(function(k){var f=h[k];h[k]=function(){var x=f.apply(this,arguments);check();return x}});addEventListener('popstate',check);addEventListener('load',function(){ready=1;check()})})(${data});`
}
