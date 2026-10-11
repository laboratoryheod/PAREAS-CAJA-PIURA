# AGENTS.md — PAREAS (Caja Piura)

Contexto para agentes (Antigravity, Claude Code, Codex, etc.). **Para retomar el trabajo, lea primero [`docs/CONTEXTO-MAESTRO.md`](docs/CONTEXTO-MAESTRO.md).** Las reglas detalladas están en `.agents/rules/`, los flujos en `.agents/workflows/` y las skills de diseño en `.agents/skills/` (también en `.claude/skills/`).

## Qué es
Módulo web mobile-first de autogestión de deuda para clientes con 1–30+ días de atraso. Tiene dos interfaces:
- `/cliente`: inicio en widgets (juego/trivia, score, calendario, pagos y juegos, beneficios/campañas/CHICOTAZO, consejos + agente Pareas), **Mis Finanzas** (calculadora de ingresos y gastos; reemplazó a "Mi plan": el cliente ya no arma planes), pagos con QR, trivia, notificaciones y asistente.
- `/banco`: panel del gestor (usuario `gestor`, clave `caja2026`) con sidebar: Resumen (KPIs, gráfico circular de la cartera con filtros, casos derivados), Cartera (con importar/exportar Excel) y **Modo Rescate** (masivo para todos los que tengan un score mínimo o más, o individual por DNI/nombre).
Usa una cartera de ejemplo en SQLite; la conexión al core bancario se hace implementando la interfaz `Repo`.

## Stack
Next.js 15 (App Router) + TypeScript 5 + Tailwind 3 + motion. SQLite local (`better-sqlite3`, se crea y llena sola en `data/ponte.db`). Tests con Vitest. Chatbot de Pareas con OpenAI (`OPENAI_API_KEY`) o Gemini (`GEMINI_API_KEY`), siempre detrás del blindaje y el FAQ local; las claves van solo en `.env.local`. El nombre de la app es **PAREAS** (`APP_NOMBRE`).
**No subir a TypeScript 7**: Next 15 no lo soporta.

## Comandos
- `npm install` · `npm run dev` · `npm test` · `npm run build`
- `npm run seed` (recrea la base) · `npm run plantilla:xlsx` · `npm run importar:xlsx -- archivo.xlsx` · `npm run export:xlsx`

## Mapa del código
- `lib/reglas.ts`: reglas de reprogramación, interés moratorio, beneficios por nivel y Modo Rescate (un solo archivo editable).
- `lib/score.ts`: `PARAMS_SCORE`, CHICOTAZO, niveles y estado de Pareas.
- `lib/servicio.ts`: toda la lógica de negocio. **Montos y fechas se calculan solo aquí (servidor).** La fecha del sistema es la **fecha real de Perú** (`hoyReal` en `lib/fecha.ts`); los días pendientes (mora, CHICOTAZO) se procesan solos en `sincronizarDias`.
- `lib/finanzas.ts` + `lib/consejos-finanzas.ts`: cálculos y consejos de Mis Finanzas (ver `MODULO_MIS_FINANZAS.md`).
- `lib/excel-cartera.ts`: formato del Excel de cartera (la lógica de importación está en `servicio.ts` → `importarCartera`).
- `lib/db/`: esquema, seed y repositorio (interfaz `Repo` + implementación SQLite).
- `lib/asistente/`: blindaje (`guardia.ts`), FAQ, reglas y HECHOS para la IA (`prompt.ts`), OpenAI (`openai.ts`) y Gemini (`gemini.ts`).
- `components/cliente/ChatPareas.tsx`: burbuja y panel del chatbot.
- `components/iconos.tsx`: **iconos propios** (no usar emojis ni librerías de iconos en la app).
- `components/ui/`: componentes copiados de cult-ui (MIT), ver su README.
- `components/cliente/inicio/`: widgets del inicio del cliente.
- `DESIGN.md`: decisiones de diseño (estilo Apple). Prevalece sobre las skills genéricas.

## Reglas que no se rompen
1. Nunca calcular montos/fechas en el navegador ni en el modelo de IA.
2. Sin emojis ni stickers en la interfaz: usar `components/iconos.tsx`.
3. El término **CHICOTAZO** se escribe así y se mantiene (−12 pts por día en mora; humor, nunca amenaza).
4. Tono: **formal (de usted)** en toda la app, incluido el asistente Pareas. **Solo dentro del juego de la trivia y en las notificaciones** (avisos del cliente, `lib/servicio.ts` → `notificacionesCliente`) se usa tono coloquial del norte ("compare", "chévere", "sino te caerá el CHICOTAZO").
5. Antes de entregar: `npm test` y `npm run build` en verde; para cambios grandes, también `scripts/qa/` (ver `docs/PLAN-DE-PRUEBAS.md`).
6. Redactar textos, comentarios y documentación como producto entregado a Caja Piura (sin menciones a maquetas ni concursos).
7. Las herramientas de prueba (Reiniciar, Pasar un día) se controlan con `MOSTRAR_HERRAMIENTAS_PRUEBA` en `lib/config.ts`.
8. Rendimiento: animaciones solo con `opacity`/`transform` (sin `filter: blur`), vistas pesadas con `next/dynamic`, fuente local con `next/font` y pantalla de carga en CSS puro (`components/PantallaCarga.tsx`).
