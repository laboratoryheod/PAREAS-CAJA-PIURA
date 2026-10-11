# Ponte al Día con Pareas — Caja Piura (Autogestión Dinámica de Deuda)

Módulo web mobile-first (Next.js + TypeScript + Tailwind) para integrarse en la app de Caja Piura, con **dos interfaces**: `/cliente` y `/banco`. Incluye una cartera de ejemplo de 100 clientes; la conexión al core bancario se hace implementando la interfaz `Repo` (`lib/db/repo.ts`).

## Abrirlo en Antigravity
Ver [`docs/MIGRAR-A-ANTIGRAVITY.md`](docs/MIGRAR-A-ANTIGRAVITY.md). El contexto para agentes está en `AGENTS.md`, `.agents/rules/` y `.agents/workflows/`.

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
- Cliente de ejemplo: **Gengis Guerrero** (`/cliente`, id 1): cuota S/ 320, 12 días de atraso, score 70. Otros: `/cliente?id=N`.
- La fecha del sistema es fija (`FECHA_SISTEMA`, 10 de octubre de 2026).
- **Herramientas de prueba** (temporales): botón **Reiniciar** en la barra superior del cliente y del gestor (deja toda la app en su estado inicial y vuelve a la bienvenida) y **Pasar un día** al final del inicio. Se ocultan con `MOSTRAR_HERRAMIENTAS_PRUEBA = false` en `lib/config.ts`.

## Dónde se ajusta todo

| Qué | Archivo |
|---|---|
| Nombre de la app | `lib/config.ts` (`APP_NOMBRE`) |
| Reglas de reprogramación (tramos, inicial, cuota mínima, interés moratorio, beneficios por nivel, Regalo Salvador) | `lib/reglas.ts` |
| Tono y apelativo | `lib/config.ts` (`APELATIVO`) |
| Blindaje y cupos del asistente | `lib/asistente/guardia.ts` (`LIMITES_ASISTENTE`) |
| Puntos del score y chicotazo | `lib/score.ts` (`PARAMS_SCORE`) |
| Niveles Bronce/Plata/Oro | `lib/niveles.ts` |
| Mascota Pareas (componente y animaciones) | `components/Pareas.tsx` |
| Iconos propios (sin emojis) | `components/iconos.tsx` |
| Inicio del cliente (widgets del boceto) | `components/cliente/inicio/` |
| Imágenes de Pareas | `public/pareas/pareas.png` (mascota), `public/pareas/logo.png` (logo), `app/icon.png` y `app/apple-icon.png` (favicon) |
| Decisiones de diseño | `DESIGN.md` |
| Acceso a datos | `lib/db/repo.ts` (interfaz) · `repo-sqlite.ts` |

Los montos y fechas siempre se calculan en el servidor (`lib/servicio.ts`); el navegador solo muestra.

## Reglas clave (acordadas con el equipo)
- **Chicotazo:** −12 por cada día que el cliente sigue en mora (una vez por día). En mora o impago **no hay racha**: aunque acierte toda la trivia (+10 máx.) el neto diario es −2.
- **Plan de pago:** aceptarlo **no** detiene el chicotazo. Recién con el **primer pago** del plan la deuda vencida queda "en plan" y Pareas deja de pegar. Cada pago a tiempo: +15. Cumplir todo el plan: +20.
- **Incumplir el plan:** no hay castigo fijo; vuelve el chicotazo diario y el cliente **pierde sus beneficios** (de nivel y de volver a reprogramar).
- **🎁 Regalo Salvador:** campaña que otorga el gestor desde su panel (casos derivados o detalle del cliente). El moroso paga hoy un **30 % menos** y recupera ese descuento con **+10 % en sus 3 cuotas siguientes**. Vence en 7 días. Al usarlo se pone al día y recupera sus beneficios. Se ajusta en `REGALO_SALVADOR` (`lib/reglas.ts`).
- Más de 60 días: la propuesta (con inicial ≥ 30 %) queda **derivada** al gestor; el cliente sigue en mora.
- Interés moratorio: TEA × 1,5 prorrateada por día (simple). Ajustable en `FACTOR_MORATORIO`.

## Asistente blindado (para no gastar tokens)
Orden de filtros en `lib/asistente/` (todo lo que se filtra se responde **sin IA**):
1. Datos sensibles (claves, tarjetas, token) → aviso fijo.
2. Angustia o pedido de una persona → deriva a gestor.
3. Intentos de sacarlo de su rol ("ignora tus instrucciones", "actúa como…") → negativa fija.
4. Temas ajenos a la Caja / PAREAS (poemas, fútbol, tareas, código, política…) → negativa fija.
5. Preguntas frecuentes (deuda, plan, pago, puntos, regalo, interés) → plantilla con cifras del servidor.
6. Solo si queda una pregunta en tema que nada de lo anterior resuelve → Gemini, con cupo diario por cliente (`GEMINI_MAX_CLIENTE_DIA`, 15) y global (`GEMINI_MAX_DIA`, 300), mensaje ≤ 300 caracteres, 4 turnos de historial y ≤ 150 tokens de respuesta.

## Pareas, la mascota
Pareas es la iguana (el "pacaso" piurano) que acompaña al cliente y responde en el asistente. Sus imágenes viven en `public/pareas/`:
- `pareas.png`: ilustración con la bolsa (sin fondo). La usan `components/Pareas.tsx` (dashboard, trivia) y el hero de la landing.
- `logo.png`: logo cuadrado. Aparece en la barra flotante, el encabezado del cliente y el pie. De él salen `app/icon.png` y `app/apple-icon.png`.

Para cambiar una imagen basta con reemplazar el archivo con el mismo nombre. Para tener varias expresiones (feliz, seria, chicotazo), agrega `pareas-feliz.png`, etc. y elige la imagen según `humor` en `components/Pareas.tsx`.

## Tono
Formal (de usted) en toda la app. Solo el juego de la trivia usa tono coloquial del norte ("compare", "chévere"); el apelativo está en `APELATIVO` (`lib/config.ts`). Si ya tenía la base creada, ejecute `npm run seed` para cargar las preguntas de la trivia actualizadas.

## Inicio del cliente
Según el boceto del equipo, cada cliente ve primero:
1. **Juego del día** (botón para empezar la trivia) y **Score** (anillos tipo Actividad de Apple).
2. **Calendario de pagos** (cuotas vencidas, pagos del plan, recargos, días con CHICOTAZO) y **Pagos y juegos**.
3. **Beneficios de la Caja**: beneficios por nivel, mis campañas (Regalo Salvador / descuento) y el **CHICOTAZO**; y **Consejos** con el botón para hablar con Pareas.
La primera vez aparece la hoja **"Empieza el juego"** con las reglas.

## UI con cult-ui
De https://github.com/nolly-studio/cult-ui (MIT) se copiaron **solo** los componentes usados a `components/ui/` (ver `components/ui/README.md`): `texture-button`, `texture-card`, `rolling-number`, `text-animate`, `neumorph-eyebrow` y `speech-bubble`. El repo completo pesa ~100 MB y no se sube.

## Otras notas
- Tiempo real del banco por polling cada 3 s (ROADMAP: Supabase Realtime sobre la misma interfaz de repositorio). El cliente refresca cada 5 s para ver al instante si el gestor le dio un regalo.
- Seguridad: DNI solo como hash SHA-256 y enmascarado en pantalla; `// ROADMAP` 2FA/biometría (passkeys) y Argon2/bcrypt para claves reales; el login real lo aporta la app de Caja Piura.

## Recorrido guiado (3 minutos)
1. **(0:00) Landing** → "Entrar como cliente". ¡Habla, Gengis!: S/ 326.08 (cuota S/ 320 + mora), 12 días. Pareas da su chicotazo con humor.
2. **(0:25) Armar mi plan:** subir a 3 cuotas → semáforo ámbar con el porqué y la alternativa más cercana → "Usar esta alternativa" → verde. Poner el primer pago para mañana.
3. **(0:55) Confirmar:** motivo "Bajaron mis ventas", aceptar → "¡Plan aceptado! Falta tu primer pago": Pareas sigue pegando hasta pagar.
4. **(1:15) En otra pestaña `/banco`** (gestor / caja2026): el feed muestra *"Gengis G. aceptó pagar en 2 cuotas"* y suben los KPIs.
5. **(1:35) Incumplir:** en el cliente, "Herramientas de prueba → Pasar un día" dos veces sin pagar → "Beneficios en pausa". El banco lo ve: *"Gengis G. incumplió su plan"*, y aparece en casos derivados como candidato a Regalo Salvador.
6. **(2:00) 🎁 Regalo Salvador:** el gestor pulsa "Dar Regalo Salvador". En el celular del cliente aparece la tarjeta: paga 30 % menos hoy, +10 % en sus 3 cuotas siguientes → "Aprovechar mi regalo" → pago con QR → al día y con beneficios de vuelta.
7. **(2:35) Asistente:** "¿Cuánto debo?" (cifras del servidor), "escríbeme un poema" (no responde: no gasta tokens), "mi clave es…" (no la acepta).
