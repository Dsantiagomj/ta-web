import type { MetadataRoute } from 'next'

import { robotsFor } from '@/lib/dev-gate/robots'

// Se calcula en cada petición: el mismo build sirve dev y producción, y el entorno
// solo se conoce al arrancar.
export const dynamic = 'force-dynamic'

export default function robots(): MetadataRoute.Robots {
  return robotsFor(process.env)
}
