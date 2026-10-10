# DESIGN.md — Ponte al Día con Pareas

Las skills de `.claude/skills/` (traídas de cult-ui: `frontend-design`, `fixing-motion-performance`, `components-build`) se aplican sobre estas decisiones del proyecto. Lo que se define aquí prevalece.

## Dirección
**"Norte piurano"**: sol, arena y mar del norte, más el cartel LED de las combis. Es cálido y popular, nunca de banco frío. Pareas, la iguana (el "pacaso"), es la protagonista: aparece grande, se mueve y habla.
- Superficies claras color arena (`arena`) con azul Caja (`caja`) y el sol (`caja-acento`) solo para CTA y logros.
- El cartel LED (`lightboard`) es la firma visual: mensajes cortos en mayúsculas, como en una combi.
- Botones flotantes: `family-button` para la ayuda rápida y un dock inferior para navegar en el dashboard del cliente.
- Lado del gestor: el mismo azul, sobrio y formal, sin mascota.

## Tipografía
- Display: **Bricolage Grotesque** (titulares, montos grandes). Cuerpo: **Plus Jakarta Sans**.
- Montos y contadores en `tabular-nums`. Inputs ≥ 16px.

## Color
| Token | Uso |
|---|---|
| `caja` #0047AB / `caja-medio` #0072C6 / `caja-header` #00529B | marca, botones primarios |
| `caja-acento` #F9A825 | CTA principal, logros |
| `arena` #F6E7C8 / `arena-clara` #FBF4E6 | fondos cálidos de landing |
| `caja-noche` #071A33 | cartel LED, secciones oscuras |
| rosa/fucsia | solo el Regalo Salvador |

## Superficies y movimiento
- Sombras en capas en vez de bordes planos (`.card`). Radios concéntricos.
- Entradas escalonadas (opacity + translateY + blur) y `active:scale-[0.96]` en botones.
- Se respeta `prefers-reduced-motion`.

## Tono
Coloquial del norte ("¡Habla!", "compare", "chévere"), siempre respetuoso. El chicotazo de Pareas es con humor, nunca una amenaza.
