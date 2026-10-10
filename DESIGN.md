# DESIGN.md — Ponte al Día con Pareas

Las skills de `.agents/skills/` y `.claude/skills/` (traídas de cult-ui: `frontend-design`, `fixing-motion-performance`, `components-build`) se aplican sobre estas decisiones del proyecto. Lo que se define aquí prevalece.

## Dirección: interfaz tipo Apple
- Limpia, luminosa y precisa, como iOS y apple.com: fondo `#F2F2F7` (app) y `#F5F5F7` (landing), superficies blancas translúcidas con `backdrop-blur` y sombras en capas en lugar de bordes.
- **Widgets** de 28 px de radio (como los del iPhone) para el inicio del cliente. Títulos grandes ("Hola, Gengis") y listas agrupadas tipo Ajustes.
- **Pareas** (la iguana) es el personaje: ilustración en `public/pareas/`, notificaciones tipo Dynamic Island.
- **CHICOTAZO** es la firma del juego: tarjeta roja con el látigo animado y la palabra en negrita itálica. Se escribe siempre así.

## Iconos
- Solo **iconos propios** de `components/iconos.tsx`: glifos SVG con trazo redondeado 1.8 en grilla de 24 (estilo SF Symbols) y `FichaApp` (squircle con degradado y brillo, como un ícono de app de iOS).
- **Nada de emojis ni stickers** dentro de la app.

## Tipografía
- San Francisco en dispositivos Apple (`-apple-system`), con Plus Jakarta Sans como respaldo.
- Títulos con tracking negativo (−0.02 a −0.045 em), números en `tabular-nums`, inputs ≥ 16 px.

## Color
| Uso | Valor |
|---|---|
| Acción (enlaces, botones) | `#0A84FF` / `#0071E3` |
| Éxito / pagado | `#34C759` |
| Alerta / mora / CHICOTAZO | `#FF3B30`, degradado `#7A0F1C → #E2401C` |
| Sol / plan | `#FF9F0A`, `#FFD60A` |
| Juego / trivia | `#5B2EE5 → #9B4DFF` |
| Regalo Salvador | `#D6247A → #FF7A59` |
| Marca Caja (panel del gestor) | `#0047AB` |

## Flotantes
- Landing: isla de navegación negra arriba (se expande al pasar o tocar) y barra translúcida abajo con "Soy cliente / Soy gestor" que aparece al bajar.
- Cliente: barra de pestañas flotante (dock de cult-ui) y botón de ayuda rápida (family-button).

## Movimiento
- Resortes sin rebote (`type: "spring", bounce: 0`), entradas con opacity + translateY + blur, salidas más sutiles.
- `active:scale-[0.96]` en botones. Respetar `prefers-reduced-motion`.

## Tono
Coloquial del norte ("¡Habla!", "compare", "chévere"), siempre respetuoso. El CHICOTAZO es con humor, nunca una amenaza.
