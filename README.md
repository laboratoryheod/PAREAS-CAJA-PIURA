# Ponte al Día — Reto 14 Caja Piura (Autogestión Dinámica de Deuda)

Prototipo mobile-first (Next.js + TypeScript + Tailwind) con **dos interfaces**: `/cliente` y `/banco`. Datos 100 % ficticios.

## Cómo correrlo

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # reglas, score, servicio y asistente
npm run build && npm start
```

- La base SQLite (`data/ponte.db`) se crea y se llena sola la primera vez (100 deudores, trivia, actividad previa).
- `npm run seed` la recrea de cero · `npm run export:xlsx` regenera `data/deudores.xlsx`.
- Opcional: copie `.env.example` a `.env.local` y ponga `GEMINI_API_KEY` para usar Gemini; sin clave el asistente responde con FAQ local.
- Panel del banco: usuario `gestor` · clave `caja2026`.
- Cliente de demo: **Gengis Guerrero** (`/cliente`, id 1): cuota S/ 320, 12 días de atraso, score 70. Otros: `/cliente?id=N`.
- La fecha de la demo es fija (`FECHA_DEMO`, 10 de octubre de 2026). En "Herramientas de la demo" puede **pasar un día** o **reiniciar**.

## Dónde se ajusta todo

| Qué | Archivo |
|---|---|
| Nombre de la app | `lib/config.ts` (`APP_NOMBRE`) |
| Reglas de reprogramación (tramos, inicial, cuota mínima, interés moratorio, beneficios por nivel) | `lib/reglas.ts` |
| Puntos del score y chicotazo | `lib/score.ts` (`PARAMS_SCORE`) |
| Niveles Bronce/Plata/Oro | `lib/niveles.ts` |
| Mascota (hoy emoji 🦫) | `components/Pacaso.tsx` |
| Acceso a datos | `lib/db/repo.ts` (interfaz) · `repo-sqlite.ts` |

Los montos y fechas siempre se calculan en el servidor (`lib/servicio.ts`); el navegador solo muestra.

## Decisiones de diseño a tener presentes
- **Chicotazo:** −12 por cada día que el cliente sigue en mora (una vez por día). La racha de +5 **no suma en mora**, así que aunque acierte toda la trivia (+10 máx.) el neto diario es −2.
- **Plan aceptado:** las cuotas vencidas pasan a "reprogramadas" y el Pacaso deja de pegar. Si un pago del plan vence sin pagarse: promesa incumplida (−25) y vuelve la mora. Cumplir todo: +20. Cada pago a tiempo: +15.
- Más de 60 días: la propuesta (con inicial ≥ 30 %) queda **derivada** al gestor; el cliente sigue en mora.
- Interés moratorio simulado: TEA × 1,5 prorrateada por día (simple). Ajustable en `FACTOR_MORATORIO`.
- Tiempo real del banco por polling cada 3 s (ROADMAP: Supabase Realtime sobre la misma interfaz de repositorio).
- Seguridad (prototipo): DNI solo como hash SHA-256 y enmascarado en pantalla; `// ROADMAP` 2FA/biometría (passkeys) y Argon2/bcrypt para claves reales; el login real lo aporta la app de Caja Piura.

## Guion de demo (3 minutos)
1. **(0:00) Landing** → "Entrar como cliente". Hola, Gengis: S/ 326.08 (cuota S/ 320 + mora), 12 días. El Pacaso da su chicotazo con humor: *"mientras siga pendiente, tus puntos bajan"*.
2. **(0:30) Armar mi plan:** subir a 3 cuotas → semáforo ámbar, explica por qué y ofrece la alternativa más cercana → "Usar esta alternativa" → verde. Mover la inicial y la fecha; el cronograma cambia en vivo.
3. **(1:15) Continuar:** motivo "Bajaron mis ventas", aceptar → plan listo con recordatorios y **QR** compartible para un familiar.
4. **(1:40) Abrir en otra pestaña `/banco`** (gestor / caja2026): el feed muestra *"Gengis G. aceptó pagar en 2 cuotas"*, KPIs y monto comprometido suben; casos derivados (>60 días) y detalle con motivo del atraso y línea de tiempo.
5. **(2:10) Pacaso en acción:** en el cliente, "Herramientas de la demo → Pasar un día" varias veces sin pagar: el plan se incumple, −25 y vuelve la mora; el banco lo ve. Pagar y ver cómo el score se recupera.
6. **(2:40) Trivia y asistente:** una pregunta de trivia (+2, tope +10/día) y al asistente "¿Cuánto debo?" / "quiero una condonación" (no promete) / "mi clave es…" (no la acepta).
