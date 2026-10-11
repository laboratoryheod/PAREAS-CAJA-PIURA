# Contexto maestro — PAREAS (Caja Piura)

Documento para retomar el trabajo en una conversación nueva (Claude Code, Antigravity, Codex u otro agente). Léalo junto con `AGENTS.md`. Si algo de aquí choca con el código, manda el código; actualice este archivo al cerrar cada ronda.

---

## 1. Qué es el producto
Es un módulo web mobile-first de autogestión de deuda para clientes de Caja Piura que tienen de 1 a más de 30 días de atraso. La mascota es **Pareas**, una iguana (el "pacaso" piurano) que acompaña al cliente y le da el **CHICOTAZO** cuando sigue en mora.

Tiene dos interfaces:
- **`/cliente`** (cliente por defecto: id 1, Gengis Guerrero; los demás con `/cliente?id=N`). El inicio está hecho de widgets estilo Apple:
  - juego del día (trivia), score con anillos, calendario de pagos, pagos y juegos;
  - beneficios, campañas y CHICOTAZO;
  - consejos, más el asistente Pareas.

  Tiene además **Mis Finanzas** (calculadora de ingresos y gastos, que reemplazó a "Mi plan": el cliente ya no arma planes en la app), el pago con QR, la trivia, el asistente, **notificaciones** y el **Modo Rescate**. Mientras carga, aparece una pantalla con Pareas y frases rotativas (`components/PantallaCarga.tsx`).
- **`/banco`**: el panel del gestor (usuario `gestor`, clave `caja2026`). Tiene un sidebar (`components/banco/MarcoGestor.tsx`) con tres secciones; en celular, el sidebar se convierte en tres pestañas.
  - **Resumen** (`/banco`, `BancoDashboard.tsx`): KPIs, el **gráfico circular** de la cartera y los casos derivados. El gráfico (`GraficoCartera.tsx`, API `/api/banco/distribucion`) muestra morosos, impagos y pagaron con filtros de tramo, tipo, estado y zona, sin DNI.
  - **Cartera** (`/banco/cartera`, `Cartera.tsx`): tabla con búsqueda y filtros, y **Cartera en Excel**: descargar plantilla, subir Excel (agrega o actualiza por ID sistema o DNI, nunca borra; "¿Ya pagó? = Sí" registra el pago) y descargar la cartera con su estado (API `/api/banco/excel`, formato en `lib/excel-cartera.ts`, lógica en `importarCartera`/`filasExportacion`).
  - **Modo Rescate** (`/banco/rescate`, `ModoRescate.tsx`, API `/api/banco/rescate`): campaña **masiva** para todos los clientes con un **score mínimo o más** que elige el gestor (atajos 40/50/60/70/80, campo libre y deslizador; pide dos toques para confirmar) y campaña **individual** buscando por DNI o nombre.
  - El detalle del cliente (`/banco/cliente/[id]`) también permite activar el Modo Rescate.
- **`/`**: landing estilo Apple, con mock de iPhone y Mac y botones flotantes.

La cartera es de ejemplo (100 deudores) y vive en SQLite. Para conectarse al core bancario hay que implementar la interfaz `Repo` (`lib/db/repo.ts`).

## 2. Stack y comandos
- **Base:** Next.js 15.5 (App Router), React 19, **TypeScript 5.9 (no subir a TS 7: Next 15 no lo soporta y se rompen los alias `@/`)**, Tailwind 3 y `motion`.
- **Datos:** `better-sqlite3`. La base `data/ponte.db` se crea y se llena sola; `SQLITE_PATH` permite apuntar a otra.
- **Pruebas:** Vitest (`tests/*.test.ts`, 65 tests).
- **Asistente:** Gemini opcional (`GEMINI_API_KEY`), con FAQ local de respaldo.
- **Librerías:** `qrcode` (QR en el servidor), `exceljs` (Excel de cartera, solo en el servidor) y `@base-ui/react`. También `class-variance-authority`, `clsx` y `tailwind-merge`. La fuente Plus Jakarta Sans se sirve con `next/font/local` desde `app/fonts/` (OFL). `lucide-react` se usa **solo** en la barra de estado del mock de iPhone.
- **Comandos:**
  - `npm install`, `npm run dev`, `npm test` y `npm run build`, luego `npm start`.
  - `npm run seed` recrea la base; `npm run plantilla:xlsx`, `npm run importar:xlsx -- archivo.xlsx` y `npm run export:xlsx` (a `data/cartera.xlsx`) manejan la cartera en Excel.
- **Fecha del sistema:** es la **fecha real de Perú** (`hoyReal()` en `lib/fecha.ts`, zona America/Lima) más los días adelantados con "Pasar un día" (`app_estado.dias_adelantados`). `sincronizarDias` (en `getRepo()` de `servicio.ts`) procesa cada día pendiente desde `app_estado.fecha_procesada` (mora, interés, planes vencidos y CHICOTAZO), con un tope de 120 días. La cartera de ejemplo se crea respecto del día en que se crea la base. `FECHA_SISTEMA=AAAA-MM-DD` fija la fecha; los tests la fijan en 2026-10-10 (`vitest.config.mts`).

## 3. Preferencias del usuario (respetar siempre)
- **Empezar toda respuesta al usuario con "Hola patrón"** (regla pedida por el usuario).
- Responder **en español**.
- **Preguntar antes de implementar si hay dudas** y **antes de cambios sustanciales**.
- **Sin emojis ni stickers** en la interfaz; los iconos propios están en `components/iconos.tsx`. Tampoco poner emojis en la documentación.
- **CHICOTAZO** se escribe así, en mayúsculas, y se mantiene. Es humor, nunca amenaza.
- Entregar como **producto para Caja Piura**: sin mencionar hackatón, concurso, reto, demo, maqueta ni prototipo, ni en textos ni en código ni en rutas.
- Al terminar cada ronda: `npm test` y `npm run build` en verde, verificación en navegador, commit y push.

## 4. Tono
- **Formal (de usted)** en toda la app, incluido el asistente Pareas.
- **Coloquial del norte** ("compare", "chévere", "oe", "sino te caerá el CHICOTAZO") **solo** en:
  1. el juego de la trivia (pantalla, mensajes, preguntas, `reaccionTrivia`);
  2. las **notificaciones** del cliente (`notificacionesCliente`).
- El apelativo vive en `APELATIVO = "compare"` (`lib/config.ts`).

## 5. Reglas de negocio (todas en el servidor)
Los **montos y fechas se calculan solo en `lib/servicio.ts`**; el navegador y la IA solo muestran.

### Score (`lib/score.ts` → `PARAMS_SCORE`)
- Inicial 70, rango 0–100.
- **Suma:**
  - trivia: +2 por acierto, con tope de +10 al día y 5 preguntas diarias;
  - racha: +5 por completar el set del día, **pero no se da en mora**;
  - pago puntual: +15;
  - plan cumplido: +20.
- **CHICOTAZO:** −12 por cada día que sigue en mora (uno por día). En mora el neto diario es como mucho −2.
- Incumplir el plan no resta puntos fijos: vuelve el CHICOTAZO diario y el cliente queda **`sin_beneficios`**.
- Niveles (`lib/niveles.ts`): Bronce por debajo de 50, Plata de 50 a 74, Oro desde 75. Oro da +1 cuota y 5 % menos de inicial.

### Reprogramación (`lib/reglas.ts` → `REGLAS`)
| Días de atraso | Cuotas máx. | Inicial |
|---|---|---|
| 1–15 | 2 | 0 % |
| 16–30 | 3 | 0 % si score ≥ 60; si no, 10 % |
| 31–60 | 4 | 20 % |
| > 60 | derivado al gestor | ≥ 30 % |

- Cuota mínima: S/ 20. El primer pago debe caer en 30 días o menos.
- **Interés moratorio:** TEA × 1,5 / 360 por día, simple (`FACTOR_MORATORIO`).
- **El plan se activa con su primer pago.** Mientras no se pague, el estado es `plan_pendiente` y sigue el CHICOTAZO.
- `sin_beneficios` bloquea los beneficios de nivel y la opción de reprogramar otra vez. Solo el Modo Rescate lo levanta.

### Modo Rescate
Internamente todavía se llama `regalo`: constante `REGALO_SALVADOR`, tabla `campanas`, tipo `regalo_salvador`, endpoint `/api/banco/regalo` y componente `RegaloSalvador.tsx`.
- Lo activa el gestor (desde el detalle o los derivados) para un cliente en mora y sin un plan en marcha.
- El cliente paga **hoy un 30 % menos** y recupera ese monto con **+10 % en sus 3 cuotas siguientes**.
- Vence en 7 días.
- Al usarlo, el cliente se pone al día y recupera sus beneficios.
- **Masivo:** `vistaPreviaRescate(min)` y `otorgarRescateMasivo(min)` (atajos en `ATAJOS_SCORE_RESCATE`) alcanzan a todos los elegibles (`puedeRecibirRegalo`) con score **igual o mayor** al mínimo.
- **Búsqueda por DNI completo:** se compara el SHA-256 de 8 dígitos con `dni_hash`. También funcionan los últimos 4 dígitos y el nombre.
- **Grupos del gráfico** (`GRUPO_DE_ESTADO`):
  - Morosos: `en_mora`, `plan_pendiente` y `derivado`.
  - Impagos: `incumplido`.
  - Pagaron: `al_dia` y `reprogramado`.
- **Colores:** azul institucional y blanco (variante `regalo` de `TextureButton`, ficha `"rescate"`), con el icono **`IcBillete`** (fajo de billetes) en el gestor y en el cliente. `IcSalvavidas` e `IcRegalo` siguen exportados, pero ya no se usan.

### Notificaciones del cliente (`notificacionesCliente` en `lib/servicio.ts`)
`GET /api/notificaciones?clienteId=N` devuelve `{ items }`. Los avisos van ordenados por `urgencia` y su id se mantiene estable durante el día:
| Tipo | Cuándo | Acción |
|---|---|---|
| `rescate` | Modo Rescate vigente | pagar |
| `pago_cerca` | pago del plan o cuota regular del crédito en 0–3 días (`DIAS_AVISO_PAGO = 3`) | pagar |
| `mora` | sigue en mora hoy ("¡Chas! Te cayó el CHICOTAZO") | pagar |
| `trivia` | le quedan preguntas hoy | trivia |

En la interfaz (`components/cliente/Notificaciones.tsx`):
- La píldora amarilla **Activar avisos** enciende las notificaciones y aparece una campana con badge.
- Los banners son estilo iOS: duran 6,5 s y se descartan arrastrando hacia arriba.
- Se muestra un solo banner a la vez (`AnimatePresence mode="wait"`). Activar los avisos no abre el centro, y con el centro abierto no salen banners, así que no se superponen.
- El centro de avisos ofrece **Desactivar avisos** y, si las herramientas de prueba están activas, **Volver a enviar**.
- También puede usar la API `Notification` del navegador, si se concede permiso.
- Guarda el estado en `localStorage` con las claves `pareas-notificaciones` y `pareas-notif-vistas`.
- El Dashboard le pasa una `firma` (fecha, estado, score, rescate, pagos y trivia) para que vuelva a consultar cuando algo cambia.

### Mis Finanzas (ver `MODULO_MIS_FINANZAS.md`)
- Cálculos puros en `lib/finanzas.ts`:
  - el resumen del mes es ingresos mensualizados − gastos del mes − próxima cuota − lo vencido (o el Modo Rescate) = lo que sobra;
  - semáforo: verde por encima del 20 %, amarillo del 5 % al 20 %, rojo por debajo del 5 % o negativo;
  - los gastos fijos se repiten cada mes.
- Los consejos (como máximo 3) salen de `lib/consejos-finanzas.ts`.
- El servicio expone `cuotaParaFinanzas` (punto de integración con el core), `finanzasCliente` y `accionFinanzas`.
- Persistencia: tablas `fin_ingresos`, `fin_gastos` y `fin_categorias`.
- API: `/api/finanzas`.
- Interfaz pensada para adultos mayores (letra ≥ 16 px, botones ≥ 48 px).
- "Hablar con un asesor" usa `/api/ayuda`.

### Chatbot de Pareas
- **Burbuja flotante** con el favicon de Pareas (`components/cliente/ChatPareas.tsx`; reemplazó el botón "+" de ayuda rápida). Abre un panel de chat que comparte la conversación con la pestaña "Pareas" del dock.
- **Proveedor:** OpenAI si existe `OPENAI_API_KEY` (`lib/asistente/openai.ts`, modelo `OPENAI_MODEL`, por defecto `gpt-4o-mini`, vía Chat Completions con `fetch`); si no, Gemini; si no, el FAQ.
- La clave se guarda solo en `.env.local`. La que se compartió en el chat debe revocarse y reemplazarse.
- Reglas y HECHOS del servidor en `lib/asistente/prompt.ts`: deuda, score, Modo Rescate, próxima cuota, canales de pago y campañas.
- `GET /api/asistente/estado` hace un diagnóstico de la conexión sin mostrar la clave.
- En este contenedor de la nube `api.openai.com` está bloqueado por la política de red: hay que agregarlo en *Network access → Allowed domains*.
- Los intentos fallidos con la IA no gastan cupo, y si falla responde el FAQ.

### Asistente blindado (`lib/asistente/`)
Los filtros se aplican en este orden; todo lo que se filtra se responde sin IA:
1. datos sensibles;
2. angustia o pedido de una persona (deriva al gestor);
3. intento de sacarlo de su rol;
4. tema ajeno;
5. FAQ con cifras del servidor;
6. IA (OpenAI o Gemini), con cupos: 15 por cliente al día y 300 en total. Lee 300 caracteres del mensaje, usa 4 turnos de historial y responde con 150 tokens como máximo.

Los cupos están en `LIMITES_ASISTENTE` (`guardia.ts`).

### Herramientas de prueba
Se controlan con `MOSTRAR_HERRAMIENTAS_PRUEBA = true` en `lib/config.ts`.
- **Reiniciar** (`components/BotonReinicio.tsx`):
  - pide dos toques para confirmar;
  - hace POST a `/api/pruebas/reset`;
  - borra las claves `pareas-*` del `localStorage` y vuelve a la bienvenida.
- **Pasar un día:** POST a `/api/pruebas/avanzar-dia`.
- **Volver a enviar:** repite los banners de notificaciones.

## 6. Diseño
Las reglas completas están en `DESIGN.md`, que prevalece sobre las skills genéricas.
- **Estilo:** Apple. Widgets redondeados, `FichaApp` (tiles tipo iOS), dock flotante y FAB.
- **Paleta Caja Piura:** `#0047AB`, `#0072C6`, `#00529B` (barra superior), acento `#F9A825` y borde `#D6E4F5`.
- **Fondo azul:** en `app/globals.css`, gradiente fijo de `#C7DBF3` a `#EDF3FB`. El calendario lleva tinte azul.
- **Logos:**
  - `public/caja/logo-caja-piura-blanco.png` va en la barra del cliente (junto a Salir; se oculta en pantallas de menos de 400 px), en la barra del gestor (`components/banco/BarraGestor.tsx`) y en el login del gestor;
  - `public/caja/logo-caja-piura-dorado.png` va bajo Beneficios.
- **Pareas:**
  - `public/pareas/pareas.png` (cuerpo entero) se usa en el header y en la app;
  - `public/pareas/logo.png` (cabeza) se usa en la isla y el asistente;
  - el favicon está en `app/icon.png` y `app/apple-icon.png`.
- **Iconos:** propios, en `components/iconos.tsx`. El Modo Rescate usa `IcSalvavidas`; `IcRegalo` sigue exportado pero ya no se usa.
- **cult-ui (MIT):** se copiaron a `components/ui/` solo los componentes usados (ver su README). Los colores `var(--x)` se envuelven en `hsl(...)`.
- **Animaciones:** sobre `transform`/`opacity`, nunca sobre `left`/`top`.
- Objetivos táctiles de al menos 44 px. Sin scroll horizontal a 375 px.

## 7. Mapa del código
```
app/
  page.tsx                 landing
  cliente/page.tsx         calcula la situación inicial en el servidor → Dashboard
  banco/page.tsx           BancoDashboard · banco/login · banco/cliente/[id] (detalle + Modo Rescate)
  api/
    cliente/[id]  pago  trivia  trivia/responder  asistente  ayuda  notificaciones  finanzas
    banco/{login,resumen,kpis,feed,cartera,derivados,distribucion,rescate,excel,cliente/[id],regalo}
    pruebas/{reset,avanzar-dia}
  globals.css · icon.png · apple-icon.png · fonts/ · loading.tsx (y cliente/, banco/)
components/
  cliente/  Dashboard (header, dock, herramientas de prueba, vistas dinámicas) · Notificaciones
            Finanzas (Mis Finanzas) · Pagar · Trivia · Asistente · RegaloSalvador (Modo Rescate)
            inicio/  Inicio · Widgets · Widget · AnilloScore · Calendario · Beneficios · Chicotazo · Isla · Bienvenida
  banco/    MarcoGestor (sidebar) · BarraGestor · BancoDashboard (Resumen) · GraficoCartera · Cartera (+ Excel) · ModoRescate · comun
  landing/Pantallas · Landing · Pareas · BotonReinicio · PantallaCarga · iconos · ui/ (cult-ui)
lib/
  config.ts   reglas.ts   score.ts   niveles.ts   servicio.ts (TODA la lógica)   finanzas.ts   consejos-finanzas.ts   excel-cartera.ts
  cronograma.ts  fecha.ts  api.ts  cliente-api.ts (api(), soles())  usar-polling.ts (usarPolling, usarDebounce)
  db/  repo.ts (interfaz)  repo-sqlite.ts  sqlite.ts  schema.sql  seed.ts  trivia-data.ts
  asistente/  guardia.ts  faq.ts  gemini.ts
tests/  reglas · score · servicio (notificaciones, gestor, fecha real) · finanzas · excel · asistente · asistente-ia
scripts/  seed · export-xlsx · importar-xlsx (también --plantilla)
MODULO_MIS_FINANZAS.md
.agents/  rules/{negocio,diseno,asistente}.md · workflows/{levantar,verificar}.md · skills/
.claude/skills/   docs/MIGRAR-A-ANTIGRAVITY.md   DESIGN.md   AGENTS.md   README.md
```

Funciones principales de `lib/servicio.ts`:
- **Cliente:** `situacion`, `registrarPago`, `finanzasCliente`, `accionFinanzas`, `cuotaParaFinanzas`, `cobroPendiente`, `triviaSiguiente`, `responderTrivia`, `pedirAyudaHumana`, `registrarEventoCliente` y `notificacionesCliente`.
- **Gestor:** `otorgarRegalo`, `vistaPreviaRescate`, `otorgarRescateMasivo`, `distribucionCartera`, `importarCartera`, `filasExportacion`, `feed`, `cartera`, `resumenBanco`, `kpis`, `derivados`, `detalleCliente` y `opcionesFiltros`.
- **Sin uso desde el cliente** (se conservan para planes existentes y pruebas): `simular` y `registrarPropuesta`. Se quitaron las rutas `/api/simular` y `/api/propuesta`.
- **Pruebas:** `avanzarDia` y `reiniciarApp`.
- **Fechas:** `sincronizarDias` y `procesarDia` (internas).

Rendimiento:
- `/cliente` carga sin peticiones, porque la situación llega del servidor.
- Las vistas secundarias se cargan con `next/dynamic`.
- El polling es de 5 s solo en el inicio y se pausa en segundo plano (Page Visibility).
- En el banco, la búsqueda tiene debounce de 300 ms y las filas están memoizadas.
- `usarDatos` (`components/banco/comun.tsx`) compara el texto crudo de la respuesta: si no cambió, no parsea ni vuelve a pintar. El gráfico consulta cada 20 s.
- Sentencias SQLite preparadas una sola vez (`prep` en `repo-sqlite.ts`), con índices de eventos, campañas, cuotas, propuestas, trivia y DNI en `schema.sql` (se crean solos en bases existentes).
- La landing carga el iPhone y el Mac con `next/dynamic` (`ssr: false` y un marcador del mismo tamaño). Sin `filter: blur` en las animaciones y con `priority` en las imágenes de arriba. El fondo va en `body::before`.
- `next.config.mjs`: `optimizePackageImports` (lucide-react, motion), AVIF/WebP, `removeConsole` (salvo error/warn) y caché de 1 día para `/pareas` y `/caja`.
- `loading.tsx` (raíz, `/cliente` y `/banco`) muestra `PantallaCarga`, hecha solo con CSS. Las vistas dinámicas del cliente usan su versión compacta. `public/pareas/pareas-carga.webp` pesa 15 KB.

## 8. Cómo verificar
1. `npm test` y `rm -rf .next && npm run build`. Si se renombran rutas, hay que borrar `.next`, porque los tipos viejos rompen el build.
2. Levantar con una base aislada: `SQLITE_PATH=/tmp/e2e.db npx next start -p 3112`. No correr `next dev` sobre el mismo `.next` antes de `next start`.
3. Antes de cada recorrido: `curl -XPOST localhost:3112/api/pruebas/reset`.
4. Hacer el recorrido E2E con Playwright, usando Chromium preinstalado (`executablePath: "/opt/pw-browsers/chromium"`, `NODE_PATH=$(npm root -g)`). El recorrido completo es:
   1. bienvenida, inicio y Mis Finanzas (agregar un gasto con error primero, borrar con confirmación);
   2. gestor: Cartera (descargar plantilla y cartera, subir Excel) y Modo Rescate masivo ("70 pts o más", campo libre, dos toques);
   3. gestor: "Activar Modo Rescate" individual;
   4. cliente: "Usar mi Modo Rescate", "Pago con Modo Rescate", "Pagar ahora" y "Pago hecho";
   5. trivia ("A jugar, compare");
   6. asistente.

   En cada pantalla se revisa que no haya emojis (regex `\p{Extended_Pictographic}` sobre `innerText`), que `scrollWidth` no pase de 375/390 px y que no haya errores de consola. Los scripts dependen de los textos de la interfaz, así que hay que actualizarlos tras cada renombre.
5. Para matar el servidor, usar el PID que da `ps` (no `pkill -f`, que mata la propia shell).

### Suites de QA (`scripts/qa/`, ver `docs/PLAN-DE-PRUEBAS.md`)
- `node scripts/qa/api.mjs` corre 71 casos de API; `interfaz.cjs`, 54 de interfaz (320/390/1366 px); `recorrido.cjs`, 11 pasos de punta a punta.
- Se ejecutan contra `next start` con `SQLITE_PATH=/tmp/qa.db`. En este contenedor: `CHROMIUM_PATH=/opt/pw-browsers/chromium NODE_PATH=$(npm root -g)`.
- Las rutas `/api/pruebas/*` responden 404 con `MOSTRAR_HERRAMIENTAS_PRUEBA = false` (las suites las necesitan activas).

## 9. Git
- Rama principal y de trabajo: **`master`** (la rama por defecto del repositorio). Se sube con `git push -u origin master`. No crear PR salvo que se pida.
- Los commits van en español y terminan con:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01WzeGaBuWddF9qP7ZgkzR2s
  ```
  En otra sesión, use la línea de sesión que indique esa sesión.

## 10. Historial de decisiones (resumen)
1. El plan arranca con el primer pago. Incumplir trae de vuelta el CHICOTAZO diario y deja al cliente sin beneficios. La reprogramación automática se quitó.
2. Se creó la campaña del gestor, primero llamada "Regalo Salvador" y ahora **Modo Rescate** (30 % menos hoy, +10 % en 3 cuotas, vence en 7 días).
3. El asistente se blindó contra temas ajenos para ahorrar tokens.
4. La UI se rehízo estilo Apple, con iconos propios, sin emojis, con componentes de cult-ui, landing con iPhone y Mac, y el inicio en widgets según el boceto del equipo.
5. Se aplicó la identidad de Caja Piura: logo blanco junto a Salir, logo dorado bajo Beneficios, barra azul y fondo azul.
6. El tono pasó a formal en toda la app; el coloquial quedó solo en la trivia y luego también en las notificaciones.
7. Se quitaron todas las referencias a concurso o demo. Las rutas `/api/demo/*` pasaron a `/api/pruebas/*`, `/api/pago-simulado` a `/api/pago` y `FECHA_DEMO` a `FECHA_SISTEMA`.
8. Se añadió el botón Reiniciar (temporal, como herramienta de prueba).
9. Se optimizó el rendimiento de `/cliente` y `/banco`.
10. Se agregaron las notificaciones del cliente y la barra con logo en el gestor.
11. El gestor pasó a tener sidebar (Resumen, Cartera y Modo Rescate). El gráfico circular reemplazó al feed y llegó el Modo Rescate masivo por puntos. El Modo Rescate quedó en azul y blanco con icono de billete, y se corrigió la superposición de las notificaciones.
15. Sesión del gestor firmada (HMAC, vence en 8 h; `lib/sesion.ts`) con bloqueo tras 5 intentos fallidos (5 min). Notificaciones del gestor (`components/banco/NotificacionesGestor.tsx`): campana con pedidos de ayuda, planes incumplidos, propuestas por revisar y pagos, con aviso en vivo.
14. Nombre de la app: **PAREAS**. (Se probó una barra con la distribución institucional de la Caja y al usuario no le gustó: se mantiene la barra anterior.) Mis Finanzas agrega el ámbito "Otros". Chatbot de Pareas con OpenAI y FAQ de vencimiento de cuota y Modo Rescate.
13. Ronda de QA: 12 bugs corregidos (rutas de prueba abiertas, ingreso único que se repetía, trivia, fechas de gastos, montos con miles, migración `fecha_demo`, Escape, áreas táctiles, textos del asistente y del detalle del gestor).
12. Modo Rescate masivo con "score mínimo o más". "Mi plan" se reemplazó por **Mis Finanzas**. Excel de cartera para importar y exportar (botones y scripts). La fecha real de Perú reemplazó a la fecha fija. Optimización de carga (fuente local, landing sin blur, statements preparados, índices, polling liviano) y pantalla de carga con Pareas.

## 11. Pendientes e ideas
- Tras importar un Excel con DNIs nuevos no hay forma de "deshacer"; si se necesita, agregar un historial de importaciones.
- El feed "En tiempo real" se quitó de la vista y lo reemplazó el gráfico; `/api/banco/feed` sigue disponible.
- (Hecho) Notificaciones para el gestor. Por ejemplo: un cliente pidió ayuda, una propuesta quedó derivada, se usó un Modo Rescate o se incumplió un plan. Se puede reutilizar el patrón de `Notificaciones.tsx` sobre el feed.
- Opcional: renombrar los identificadores internos `regalo` → `rescate`. Afecta la tabla, la API, los componentes y los tests, y requiere `npm run seed`.
- Antes de producción: poner `MOSTRAR_HERRAMIENTAS_PRUEBA = false` y quitar el botón Reiniciar si ya no se necesita.
- La bolsa de la imagen de Pareas lleva un logo parecido al de la Caja; revisarlo con el área de marca.
- Para conectar el core bancario, implementar `Repo` con la fuente real y quitar el seed automático.
