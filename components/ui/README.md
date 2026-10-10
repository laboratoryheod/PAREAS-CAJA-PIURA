# Componentes de cult-ui

Copiados (solo los que usamos) de https://github.com/nolly-studio/cult-ui — licencia MIT, © 2023 Jordan-Gilliam.
No se instala el repositorio completo (≈100 MB): solo estos archivos de código fuente.

| Archivo | Origen | Cambios |
|---|---|---|
| `rolling-number.tsx` | `registry/default/ui/rolling-number.tsx` | ninguno |
| `text-animate.tsx` | `registry/default/ui/text-animate.tsx` | ninguno |
| `texture-button.tsx` | `registry/default/ui/texture-button.tsx` | variantes con los colores de la Caja, alto mínimo 48 px |
| `texture-card.tsx` | `registry/default/ui/texture-card.tsx` | solo la variante `TextureCardStyled`, sin variables de shadcn |
| `neumorph-eyebrow.tsx` | `registry/default/ui/neumorph-eyebrow.tsx` | intents de nivel (oro, plata, bronce) y alerta |
| `speech-bubble.tsx` | `registry/default/ui/speech-bubble.tsx` | globo para el Pacaso: colores, texto normal, cola a la izquierda |

Para agregar otro: copiar el archivo desde el repo de cult-ui a esta carpeta y revisar sus dependencias (`motion`, `class-variance-authority`, `@radix-ui/react-slot`).
