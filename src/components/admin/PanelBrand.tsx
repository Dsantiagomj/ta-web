import { Emblem } from '@/components/brand/Emblem'
import { panelStrings } from '@/lib/admin/strings'

// La marca en el panel de Payload (admin.components): el emblema y el nombre de Torrente
// Arcano en lugar del logo de Payload. Los colores salen de custom.scss, porque el panel no
// carga los estilos del sitio.

const b = panelStrings.brand

/** El logo del inicio de sesión: el emblema y el nombre en dos líneas, como el «Sello». */
export function PanelLogo() {
  return (
    <span className="ta-brand">
      <Emblem size={56} className="ta-emblem" />
      <span className="ta-brand__word">
        <span>{b.top}</span> <span className="ta-brand__accent">{b.accent}</span>
      </span>
    </span>
  )
}

/** El icono del menú y de la cabecera: el emblema, que enlaza al panel de control. */
export function PanelIcon() {
  return (
    <span className="ta-icon">
      <Emblem size={24} variant="simple" className="ta-emblem" />
      <span className="ta-sr-only">
        {b.top} {b.accent}
      </span>
    </span>
  )
}

/** Unas líneas de bienvenida sobre el formulario de inicio de sesión. */
export function LoginWelcome() {
  return (
    <div className="ta-welcome">
      <p className="ta-welcome__title">{panelStrings.login.welcome}</p>
      <p>{panelStrings.login.help}</p>
    </div>
  )
}
