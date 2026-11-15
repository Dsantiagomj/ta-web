import type { Field, GlobalConfig } from 'payload'

import { isPanelUser } from '../collections/editorial-access'
import { panelStrings } from '../lib/admin/strings'
import { siteSettingsDefaults as d, type SiteSocials } from '../lib/site-copy/defaults'
import { validateLinkUrl } from '../lib/site-copy/link'
import { siteCopyStrings } from '../lib/site-copy/strings'
import { copyField, revalidateSiteCopyAfterChange } from './site-copy-fields'

const s = siteCopyStrings.settings
const f = s.footer
const n = s.socials

/** Una red: su enlace, que se comprueba en el navegador y al guardar, y su nombre de usuario. */
function network(key: keyof SiteSocials): Field {
  const defaults: { url: string; handle?: string } = d.socials[key]
  return {
    name: key,
    label: n.networks[key],
    type: 'group',
    fields: [
      {
        name: 'url',
        label: n.url,
        type: 'text',
        defaultValue: defaults.url,
        validate: validateLinkUrl,
        admin: {
          description: n.urlDescription,
          components: { Field: '/components/admin/ValidatedTextField#LinkUrlField' },
        },
      },
      ...(defaults.handle ? [copyField('handle', n.handle, defaults.handle)] : []),
    ],
  }
}

// Lo que sale en todas las páginas (src/lib/site-copy/defaults.ts): el layout lo lee en caché
// con la etiqueta de los textos del sitio, que caduca al guardar.
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: s.label,
  admin: { group: panelStrings.groups.settings, hideAPIURL: true, description: s.intro },
  access: { read: () => true, update: isPanelUser },
  hooks: { afterChange: [revalidateSiteCopyAfterChange] },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: s.tabs.general,
          fields: [
            copyField('name', s.name.label, d.name, { description: s.name.description }),
            copyField('description', s.siteDescription.label, d.description, {
              long: true,
              description: s.siteDescription.description,
            }),
            {
              name: 'ogImage',
              label: s.ogImage.label,
              type: 'upload',
              relationTo: 'media',
              admin: { description: s.ogImage.description },
            },
          ],
        },
        {
          label: s.tabs.footer,
          fields: [
            {
              name: 'footer',
              label: f.label,
              type: 'group',
              fields: [
                copyField('bio', f.bio, d.footer.bio, { long: true }),
                copyField('liveTitle', f.liveTitle, d.footer.liveTitle),
                copyField('liveText', f.liveText, d.footer.liveText, { long: true }),
                copyField('discordTitle', f.discordTitle, d.footer.discordTitle),
                copyField('discordText', f.discordText, d.footer.discordText, { long: true }),
                copyField('kofiTitle', f.kofiTitle, d.footer.kofiTitle),
                copyField('kofiText', f.kofiText, d.footer.kofiText, { long: true }),
                copyField('disclaimer', f.disclaimer, d.footer.disclaimer, { long: true }),
              ],
            },
          ],
        },
        {
          label: s.tabs.socials,
          fields: [
            {
              name: 'socials',
              label: n.label,
              type: 'group',
              admin: { description: n.description },
              fields: (['twitch', 'kick', 'youtube', 'discord', 'kofi'] as const).map(network),
            },
          ],
        },
      ],
    },
  ],
}
