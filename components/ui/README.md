# Componentes de cult-ui

Copiados (solo los que usamos) de https://github.com/nolly-studio/cult-ui — licencia MIT, © 2023 Jordan-Gilliam.
No se instala el repositorio completo (≈100 MB): solo estos archivos de código fuente.

| Archivo | Origen | Cambios |
|---|---|---|
| `rolling-number.tsx` | `registry/default/ui/rolling-number.tsx` | ninguno |
| `texture-button.tsx` | `registry/default/ui/texture-button.tsx` | variantes con los colores de la Caja, alto mínimo 48 px |
| `speech-bubble.tsx` | `registry/default/ui/speech-bubble.tsx` | globo para Pareas: colores, texto normal, cola a la izquierda |
| `apple-iphone-17-pro.tsx` | `registry/default/ui/apple-iphone-17-pro.tsx` | prop `alto` (iPhone de la landing con la Dynamic Island del CHICOTAZO) |
| `mock-browser-window.tsx` | `registry/default/ui/mock-browser-window.tsx` | ninguno (ventana Safari con el panel del gestor) |
| `halo-segmented.tsx` | `registry/default/ui/halo-segmented.tsx` | ninguno (control segmentado: landing y beneficios) |
| `halo-progress.tsx` | `registry/default/ui/halo-progress.tsx` | ninguno (avance de la trivia) |
| `dock.tsx` | `registry/default/ui/dock.tsx` | modo navegación: `onClick`, `activo`, `etiqueta` (barra de pestañas flotante del cliente) |
| `family-button.tsx` | `registry/default/ui/family-button.tsx` | colores de la Caja, iconos propios (botón flotante de ayuda) |

Las skills para agentes de cult-ui (`frontend-design`, `fixing-motion-performance`, `components-build`) están en `.claude/skills/` y `.agents/skills/`, y las decisiones de diseño del proyecto en `DESIGN.md`.

Para agregar otro: copiar el archivo desde el repo de cult-ui a esta carpeta y revisar sus dependencias (`motion`, `class-variance-authority`, `@radix-ui/react-slot`, `@base-ui/react`, `lucide-react` (solo la barra de estado del iPhone), `react-use-measure`). Los tokens de shadcn (`bg-card`, `text-foreground`…) ya están definidos en `tailwind.config.ts`.
