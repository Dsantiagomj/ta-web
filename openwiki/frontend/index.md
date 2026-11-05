# Files

- [Component catalog (/sistema)](component-catalog.md) - The /sistema page that renders every DESIGN.md component with real content in the five themes and both modes, the per-request gate that keeps it out of production, and the Playwright and axe checks that run against it.
- [Design system components](design-system-components.md) - The generic UI components in src/components/ui and the quest guide components in src/components/game, how they are styled, the single PageEnhancements client island that copies coordinates, plays videos and opens images fullscreen, and the pure helpers in src/lib/guides they rely on.
- [Styles, tokens and site shell](styles-and-shell.md) - The Tailwind v4 token system in src/styles/theme.css, how theme and mode variables cascade, the self-hosted fonts, global base styles, and the current frontend layout, home page and Spanish string modules.
- [Theme and mode](theme-and-mode.md) - The two independent appearance settings, a server-decided theme gated by premium entitlement and a free dark or light mode kept in a cookie and localStorage, plus the pre-paint script and the ModeToggle island.
