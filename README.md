# PAREAS — Caja Piura (autogestión de deuda y finanzas con Pareas)

Módulo web mobile-first (Next.js + TypeScript + Tailwind) para integrarse en la app de Caja Piura, con **dos interfaces**: `/cliente` y `/banco`. Incluye una cartera de ejemplo de 100 clientes; la conexión al core bancario se hace implementando la interfaz `Repo` (`lib/db/repo.ts`).

## Abrirlo en Antigravity
Ver [`docs/MIGRAR-A-ANTIGRAVITY.md`](docs/MIGRAR-A-ANTIGRAVITY.md). El contexto para agentes está en [`docs/CONTEXTO-MAESTRO.md`](docs/CONTEXTO-MAESTRO.md), `AGENTS.md`, `.agents/rules/` y `.agents/workflows/`.

## Cómo correrlo

```bash
npm install
npm run dev          # http://localhost:3000
npm run levantar     # si sale "puerto ocupado": cierra lo que use el 3000 y levanta la app
npm test             # reglas, score, servicio, Mis Finanzas, Excel y asistente
npm run build && npm start
```

Pruebas de calidad de punta a punta (API, interfaz y recorrido completo): ver [`scripts/qa/README.md`](scripts/qa/README.md). El plan de pruebas y el último diagnóstico están en [`docs/PLAN-DE-PRUEBAS.md`](docs/PLAN-DE-PRUEBAS.md).

- La base SQLite (`data/ponte.db`) se crea y se llena sola la primera vez (100 deudores, trivia, actividad previa).
- `npm run seed` la recrea de cero.
- **Cartera en Excel** (también con botones en Panel del gestor › Cartera): `npm run plantilla:xlsx` crea `data/plantilla-cartera.xlsx` · `npm run importar:xlsx -- archivo.xlsx` agrega clientes nuevos y actualiza los existentes por ID sistema o DNI (nunca borra; "¿Ya pagó? = Sí" registra el pago) · `npm run export:xlsx` descarga la cartera actual a `data/cartera.xlsx`.
- **Chatbot de Pareas** (burbuja flotante con su favicon): copie `.env.example` a `.env.local` y ponga `OPENAI_API_KEY` (u opcionalmente `GEMINI_API_KEY`). Sin clave responde con los filtros y el FAQ local. `GET /api/asistente/estado` dice qué proveedor está activo y si OpenAI responde. **Nunca suba claves al repositorio** (`.env.local` está en `.gitignore`).
- Panel del banco: usuario `gestor` · clave `caja2026`.
- Cliente de ejemplo: **Gengis Guerrero** (`/cliente`, id 1): cuota S/ 320, 12 días de atraso el día en que se crea la base, score 70, con ingresos y gastos de ejemplo en Mis Finanzas. Otros: `/cliente?id=N`.
- **Fecha del sistema: la fecha real de Perú** (America/Lima). Cada día que pasa se procesan solos la mora, el interés y el CHICOTAZO (una vez por día, aunque nadie abra la app ese día). `FECHA_SISTEMA=AAAA-MM-DD` la fija (lo usan las pruebas automáticas) y "Pasar un día" la adelanta.
- **Herramientas de prueba** (temporales): botón **Reiniciar** en la barra superior del cliente y del gestor (deja toda la app en su estado inicial y vuelve a la bienvenida) y **Pasar un día** al final del inicio. Se ocultan con `MOSTRAR_HERRAMIENTAS_PRUEBA = false` en `lib/config.ts`.

## Dónde se ajusta todo

| Qué | Archivo |
|---|---|
| Nombre de la app | `lib/config.ts` (`APP_NOMBRE`) |
| Reglas de reprogramación (tramos, inicial, cuota mínima, interés moratorio, beneficios por nivel, Modo Rescate) | `lib/reglas.ts` |
| Tono y apelativo | `lib/config.ts` (`APELATIVO`) |
| Blindaje y cupos del asistente | `lib/asistente/guardia.ts` (`LIMITES_ASISTENTE`) |
| Puntos del score y chicotazo | `lib/score.ts` (`PARAMS_SCORE`) |
| Niveles Bronce/Plata/Oro | `lib/niveles.ts` |
| Mascota Pareas (componente y animaciones) | `components/Pareas.tsx` |
| Iconos propios (sin emojis) | `components/iconos.tsx` |
| Inicio del cliente (widgets del boceto) | `components/cliente/inicio/` |
| Mis Finanzas (calculadora de ingresos y gastos) | `lib/finanzas.ts` (cálculos), `lib/consejos-finanzas.ts` (consejos), `components/cliente/Finanzas.tsx` · ver [`MODULO_MIS_FINANZAS.md`](MODULO_MIS_FINANZAS.md) |
| Excel de cartera (columnas) | `lib/excel-cartera.ts` |
| Pantalla de carga con Pareas | `components/PantallaCarga.tsx` (frases en `FRASES_CARGA`) |
| Imágenes de Pareas | `public/pareas/pareas.png` (mascota), `public/pareas/logo.png` (logo), `app/icon.png` y `app/apple-icon.png` (favicon) |
| Decisiones de diseño | `DESIGN.md` |
| Acceso a datos | `lib/db/repo.ts` (interfaz) · `repo-sqlite.ts` |

Los montos y fechas siempre se calculan en el servidor (`lib/servicio.ts`); el navegador solo muestra.

## Reglas clave (acordadas con el equipo)
- **Chicotazo:** −12 por cada día que el cliente sigue en mora (una vez por día). En mora o impago **no hay racha**: aunque acierte toda la trivia (+10 máx.) el neto diario es −2.
- **El cliente ya no arma planes en la app** ("Mi plan" se reemplazó por **Mis Finanzas**): paga su deuda vencida desde "Pagar hoy" y, si no le alcanza, un asesor revisa su caso. Las reglas de reprogramación (`lib/reglas.ts`) siguen en el servidor para los planes que ya existen y para el gestor.
- **Plan de pago (planes existentes):** aceptarlo **no** detiene el chicotazo. Recién con el **primer pago** del plan la deuda vencida queda "en plan" y Pareas deja de pegar. Cada pago a tiempo: +15. Cumplir todo el plan: +20.
- **Incumplir el plan:** no hay castigo fijo; vuelve el chicotazo diario y el cliente **pierde sus beneficios** (de nivel y de volver a reprogramar).
- **Modo Rescate:** campaña que activa el gestor desde su panel: masiva para todos los clientes con un **score mínimo o más** que elige el gestor (atajos 40/50/60/70/80 o cualquier número; `ATAJOS_SCORE_RESCATE` en `lib/servicio.ts`) o individual (casos derivados, búsqueda por DNI o nombre, detalle del cliente). El moroso paga hoy un **30 % menos** y recupera ese descuento con **+10 % en sus 3 cuotas siguientes**. Vence en 7 días. Al usarlo se pone al día y recupera sus beneficios. Se ajusta en `REGALO_SALVADOR` (`lib/reglas.ts`).
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
Formal (de usted) en toda la app. Solo el juego de la trivia y las notificaciones usan tono coloquial del norte ("compare", "chévere"); el apelativo está en `APELATIVO` (`lib/config.ts`). Si ya tenía la base creada, ejecute `npm run seed` para cargar las preguntas de la trivia actualizadas.

## Notificaciones del cliente
Campana en la barra superior del cliente (`components/cliente/Notificaciones.tsx`), con banners estilo iOS y centro de avisos. Se encienden con la píldora **Activar avisos** y se apagan desde el propio centro. El servidor decide qué avisar (`notificacionesCliente` en `lib/servicio.ts`, API `GET /api/notificaciones?clienteId=`):
- **Modo Rescate** vigente otorgado por el gestor.
- **Pago cerca**: un pago del plan vence en 3 días o menos (`DIAS_AVISO_PAGO`).
- **CHICOTAZO**: el cliente sigue en mora hoy.
- **Trivia pendiente**: aún puede ganar puntos hoy.
Con `MOSTRAR_HERRAMIENTAS_PRUEBA` el centro muestra **Volver a enviar** para repetir los banners.

## Inicio del cliente
Según el boceto del equipo, cada cliente ve primero:
1. **Juego del día** (botón para empezar la trivia) y **Score** (anillos tipo Actividad de Apple).
2. **Calendario de pagos** (cuotas vencidas, pagos del plan, recargos, días con CHICOTAZO) y **Pagos y juegos**.
3. **Beneficios de la Caja**: beneficios por nivel, mis campañas (Modo Rescate / descuento) y el **CHICOTAZO**; y **Consejos** con el botón para hablar con Pareas.
La primera vez aparece la hoja **"Empieza el juego"** con las reglas.

## UI con cult-ui
De https://github.com/nolly-studio/cult-ui (MIT) se copiaron **solo** los componentes usados a `components/ui/` (ver `components/ui/README.md`): `texture-button`, `texture-card`, `rolling-number`, `text-animate`, `neumorph-eyebrow` y `speech-bubble`. El repo completo pesa ~100 MB y no se sube.

## Otras notas
- Panel del gestor con sidebar: **Resumen** (KPIs, gráfico circular de morosos / impagos / pagaron con filtros de tramo, tipo, estado y zona, y casos derivados), **Cartera** (tabla con búsqueda y filtros) y **Modo Rescate** (campaña masiva por rango de score y campaña individual buscando por DNI o nombre). Se actualiza por polling (ROADMAP: Supabase Realtime sobre la misma interfaz de repositorio). El cliente refresca cada 5 s para ver al instante si el gestor le activó un Modo Rescate.
- Seguridad: DNI solo como hash SHA-256 y enmascarado en pantalla; `// ROADMAP` 2FA/biometría (passkeys) y Argon2/bcrypt para claves reales; el login real lo aporta la app de Caja Piura.

## Recorrido guiado (3 minutos)
1. **(0:00) Landing** → "Entrar como cliente". Mientras carga, Pareas salta con sus frases ("Afilando el coletazo…"). Gengis tiene S/ 326.08 vencidos (cuota S/ 320 + mora) y 12 días de atraso: Pareas da su CHICOTAZO.
2. **(0:25) Mis Finanzas:** lo que gana − lo que gasta − la cuota − lo vencido = lo que le sobra, con semáforo, gráfico por categoría y hasta 3 consejos. Agregar un gasto ("Gas de cocina", S/ 45.50) y ver cómo cambia el resultado.
3. **(1:00) Avisos:** "Activar avisos" en la barra: banners del CHICOTAZO, la trivia y la cuota que se acerca.
4. **(1:15) En otra pestaña `/banco`** (gestor / caja2026): KPIs y gráfico de la cartera con filtros.
5. **(1:35) Modo Rescate masivo:** sección Modo Rescate → "50 pts o más" (o escribir otro mínimo) → ver cuántos califican → Activar (dos toques). Gengis lo recibe en su celular con notificación → "Usar mi Modo Rescate" → pago con QR → al día.
6. **(2:10) Excel:** Cartera → "Descargar cartera en Excel", marcar "¿Ya pagó? = Sí" a un cliente y subirlo de nuevo: queda al día. "Descargar plantilla" para cargar clientes nuevos.
7. **(2:35) Asistente:** "¿Cuánto debo?" (cifras del servidor), "escríbeme un poema" (no responde: no gasta tokens), "mi clave es…" (no la acepta).
