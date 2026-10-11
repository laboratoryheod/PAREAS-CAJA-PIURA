# AGENTS.md — Ponte al Día con Pareas (Reto 14 Caja Piura)

Contexto para agentes (Antigravity, Claude Code, Codex, etc.). Las reglas detalladas están en `.agents/rules/`, los flujos en `.agents/workflows/` y las skills de diseño en `.agents/skills/` (también en `.claude/skills/`).

## Qué es
Prototipo web mobile-first de autogestión de deuda para clientes con 1–30+ días de atraso. Tiene dos interfaces:
- `/cliente`: inicio en widgets (juego/trivia, score, calendario, pagos y juegos, beneficios/campañas/CHICOTAZO, consejos + agente Pareas), simulador de plan, pagos con QR, trivia y asistente.
- `/banco`: panel del gestor (usuario `gestor`, clave `caja2026`) con KPIs, feed en tiempo real (polling de 3 s), cartera, casos derivados y el **Regalo Salvador**.
Todo usa datos ficticios. No hay conexión al core bancario.

## Stack
Next.js 15 (App Router) + TypeScript 5 + Tailwind 3 + motion. SQLite local (`better-sqlite3`, se crea y llena sola en `data/ponte.db`). Tests con Vitest. Asistente con Gemini opcional (`GEMINI_API_KEY`) y FAQ local de respaldo.
**No subir a TypeScript 7**: Next 15 no lo soporta.

## Comandos
- `npm install` · `npm run dev` · `npm test` · `npm run build`
- `npm run seed` (recrea la base) · `npm run export:xlsx`

## Mapa del código
- `lib/reglas.ts`: reglas de reprogramación, interés moratorio, beneficios por nivel y Regalo Salvador (un solo archivo editable).
- `lib/score.ts`: `PARAMS_SCORE`, CHICOTAZO, niveles y estado de Pareas.
- `lib/servicio.ts`: toda la lógica de negocio. **Montos y fechas se calculan solo aquí (servidor).**
- `lib/db/`: esquema, seed y repositorio (interfaz `Repo` + implementación SQLite).
- `lib/asistente/`: blindaje (`guardia.ts`), FAQ y Gemini.
- `components/iconos.tsx`: **iconos propios** (no usar emojis ni librerías de iconos en la app).
- `components/ui/`: componentes copiados de cult-ui (MIT), ver su README.
- `components/cliente/inicio/`: widgets del inicio del cliente.
- `DESIGN.md`: decisiones de diseño (estilo Apple). Prevalece sobre las skills genéricas.

## Reglas que no se rompen
1. Nunca calcular montos/fechas en el navegador ni en el modelo de IA.
2. Sin emojis ni stickers en la interfaz: usar `components/iconos.tsx`.
3. El término **CHICOTAZO** se escribe así y se mantiene (−12 pts por día en mora; humor, nunca amenaza).
4. Tono: **formal (de usted)** en toda la app, incluido el asistente Pareas. **Solo dentro del juego de la trivia** se usa tono coloquial del norte ("compare", "chévere").
5. Antes de entregar: `npm test` y `npm run build` en verde.
