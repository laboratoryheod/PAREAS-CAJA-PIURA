# PAREAS · Caja Piura

**PAREAS** es el módulo de autogestión de deuda de Caja Piura. Atiende al cliente en la ventana en la que todavía se puede recuperar el crédito: **del día 1 al día 30 de atraso**, antes de que la SBS lo califique como deficiente (día 31) y la deuda camine al castigo.

Lo hace con tres acciones:

1. **Recordar** con humor norteño, sin hostigar. Pareas, el pacaso de los algarrobales, "da su CHICOTAZO": resta puntos mientras el cliente siga en mora.
2. **Ordenar** las finanzas del cliente. En **Mis Finanzas** ve cuánto gana, cuánto gasta, cuánto le toca pagar y cuánto le sobra.
3. **Rescatar** desde el panel del gestor. El gestor activa el **Modo Rescate** a todo un segmento de la cartera (por score) o a un cliente puntual, en un clic y sin salir a la calle.

Es una aplicación web *mobile-first* (Next.js + TypeScript + Tailwind) pensada para integrarse en la app de Caja Piura. Trae una cartera de ejemplo de 100 clientes en SQLite. La conexión al core bancario se hace implementando la interfaz `Repo` (`lib/db/repo.ts`).

---

## Contenido
- [Interfaces](#interfaces)
- [Puesta en marcha](#puesta-en-marcha)
- [Configuración](#configuración)
- [Arquitectura](#arquitectura)
- [Reglas de negocio](#reglas-de-negocio)
- [Asistente Pareas](#asistente-pareas)
- [Seguridad](#seguridad)
- [Cartera en Excel](#cartera-en-excel)
- [Rutas](#rutas)
- [Pruebas](#pruebas)
- [Video del pitch](#video-del-pitch)
- [Despliegue](#despliegue)
- [Dónde se ajusta cada cosa](#dónde-se-ajusta-cada-cosa)
- [Documentación relacionada](#documentación-relacionada)

---

## Interfaces

### Cliente (`/cliente`)
Pensada para el celular. Cliente de ejemplo: **Gengis Guerrero**, bodeguero de Piura, con cuota de S/ 320, 12 días de atraso el día en que se crea la base y score 70. Para ver a otro cliente, use `/cliente?id=N`.

- **Bienvenida**: hoja inicial con las reglas del juego: trivia, pagos a tiempo, CHICOTAZO y campañas.
- **Inicio en widgets**:
  - juego del día y score con su nivel (Bronce, Plata, Oro);
  - calendario de pagos;
  - deuda de hoy, con atajos para pagar, ir a Mis Finanzas o mandar un QR a un familiar;
  - beneficios, campañas y CHICOTAZO;
  - consejo del día y acceso a Pareas.
- **Avisos**: banners tipo iOS y centro de notificaciones en tono coloquial ("compare"). Avisan del Modo Rescate, la cuota que se acerca, el CHICOTAZO y la trivia pendiente.
- **Mis Finanzas**: calculadora de ingresos y gastos (casa, negocio y otros).
  - Muestra el resumen del mes: ingresos − gastos − cuota − deuda vencida = lo que sobra.
  - Usa un semáforo según lo que sobra: verde, más de 20 %; amarillo, de 5 % a 20 %; rojo, menos de 5 %.
  - Agrega gráfico por categoría y hasta 3 consejos.
- **Pago con QR**: deuda de hoy o monto del Modo Rescate, con comprobante. El mismo QR sirve para que pague un familiar.
- **Trivia del día**: 5 preguntas de educación financiera. Es la única parte, junto con los avisos, que usa tono coloquial.
- **Pareas, el asistente**: burbuja flotante de chat. Responde con los datos del servidor y nunca pide claves (ver [Asistente Pareas](#asistente-pareas)).

### Gestor (`/banco`)
Acceso con usuario `gestor` y clave `caja2026`. En producción se cambian con `BANCO_USUARIO` y `BANCO_CLAVE`. Tiene una barra lateral con tres secciones:

- **Resumen**:
  - indicadores de la cartera: avisos, módulos abiertos, montos comprometidos y casos para gestor;
  - gráfico circular de *morosos*, *impagos* y *pagaron*, con filtros por tramo, tipo de crédito, estado y zona;
  - lista de casos derivados.
- **Cartera**: tabla con búsqueda y filtros, ficha de cada cliente, y botones para importar y exportar Excel.
- **Modo Rescate**:
  - **masivo**: para todos los clientes con un *score mínimo o más*, con atajos de 40 a 80 puntos o cualquier número, y vista previa de cuántos califican y cuánto deben;
  - **individual**: buscando al cliente por DNI o por nombre.
- **Notificaciones del gestor**: pedidos de ayuda, planes incumplidos, propuestas por revisar y pagos, con aviso en vivo.

---

## Puesta en marcha

Requisitos: Node.js 20 o superior.

```bash
npm install
npm run dev          # http://localhost:3000
npm run levantar     # si el puerto 3000 está ocupado: lo libera y levanta la app (npm run levantar -- 3001 para otro puerto)
npm test             # pruebas unitarias
npm run build && npm start
```

- La base SQLite (`data/ponte.db`) se crea y se llena sola la primera vez, con 100 deudores, la trivia y actividad previa. `npm run seed` la recrea de cero.
- **Fecha del sistema**: es la fecha real de Perú (America/Lima). La mora, el interés y el CHICOTAZO de cada día se procesan solos, aunque nadie abra la app ese día.
- **Herramientas de prueba**: *Reiniciar* (barra superior) y *Pasar un día* (final del inicio). Se apagan compilando con `NEXT_PUBLIC_HERRAMIENTAS_PRUEBA=0` en `.env.local`. Con eso, las rutas `/api/pruebas/*` responden 404.

---

## Configuración

Copie `.env.example` a `.env.local`. Ese archivo **nunca** se sube al repositorio, porque está en `.gitignore`. Sin claves de IA la app funciona completa y el chat responde con sus filtros y su FAQ local.

| Variable | Para qué | Por defecto |
|---|---|---|
| `OPENAI_API_KEY` | Chat de Pareas con OpenAI (tiene prioridad sobre Gemini) | vacío |
| `OPENAI_MODEL` | Modelo de OpenAI | `gpt-4o-mini` |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Alternativa con Gemini | vacío / `gemini-2.0-flash` |
| `IA_MAX_CLIENTE_DIA` / `IA_MAX_DIA` | Cupo diario de respuestas con IA por cliente y en total | `15` / `300` |
| `BANCO_USUARIO` / `BANCO_CLAVE` | Credenciales del panel del gestor | `gestor` / `caja2026` |
| `SESION_SECRETO` | Secreto para firmar la sesión del gestor (texto largo y aleatorio en producción) | derivado de la clave del gestor |
| `SQLITE_PATH` | Ruta de la base SQLite | `data/ponte.db` |
| `FECHA_SISTEMA` | Fija la fecha (`AAAA-MM-DD`); la usan las pruebas automáticas | fecha real de Perú |
| `NEXT_PUBLIC_HERRAMIENTAS_PRUEBA` | `0` apaga Reiniciar, Pasar un día y `/api/pruebas/*` (se lee al compilar) | `1` |

`GET /api/asistente/estado` indica qué proveedor de IA está activo y si responde.

---

## Arquitectura

```
Navegador (cliente / gestor)
   │  solo muestra: nunca calcula montos ni fechas
   ▼
app/api/*  (route handlers de Next.js)  ──  middleware.ts protege /banco y /api/banco
   ▼
lib/servicio.ts   toda la lógica de negocio: deuda, mora, score, CHICOTAZO,
   │              Modo Rescate, notificaciones, Mis Finanzas, Excel
   ├── lib/reglas.ts · lib/score.ts · lib/finanzas.ts · lib/fecha.ts
   ├── lib/asistente/   blindaje → FAQ → IA (OpenAI o Gemini)
   ▼
lib/db/repo.ts  (interfaz Repo)  →  repo-sqlite.ts  →  SQLite (better-sqlite3)
                                    └─ aquí se conecta el core de Caja Piura
```

- **Stack**: Next.js 15 (App Router), React 19, TypeScript 5, Tailwind 3, motion, better-sqlite3, exceljs, qrcode y Vitest. No se debe subir a TypeScript 7, porque Next 15 no lo soporta.
- **Regla de oro**: los montos y las fechas se calculan solo en el servidor (`lib/servicio.ts`). Ni el navegador ni la IA los calculan.
- **Tiempo real**: se hace por *polling* liviano.
  - El cliente refresca cada 5 s en el inicio; así ve al instante un Modo Rescate recién activado.
  - El gráfico del gestor se actualiza cada 20 s y sus notificaciones cada 10 s.
  - Si la respuesta no cambió, no se vuelve a pintar.
- **Rendimiento**:
  - las vistas secundarias se cargan con `next/dynamic`;
  - la fuente es local (`next/font`, Plus Jakarta Sans);
  - las animaciones usan solo `opacity` y `transform`;
  - la pantalla de carga con Pareas está hecha en CSS puro;
  - las sentencias SQLite se preparan una sola vez y se crearon índices.
- **Diseño**: estilo Apple con los colores de Caja Piura. Usa iconos propios (`components/iconos.tsx`) y ningún emoji. Los componentes copiados de cult-ui (MIT) están en `components/ui/`. Las decisiones de diseño están en [`DESIGN.md`](DESIGN.md).

---

## Reglas de negocio

| Regla | Valor | Dónde |
|---|---|---|
| Score inicial | 70 puntos (de 0 a 100) | `lib/score.ts` (`PARAMS_SCORE`) |
| Niveles | Bronce, Plata desde 50 y Oro desde 75 | `lib/niveles.ts` |
| Trivia | +2 por acierto, hasta +10 al día; la racha no se otorga en mora | `PARAMS_SCORE` |
| Pago a tiempo | +15 puntos | `PARAMS_SCORE` |
| **CHICOTAZO** | −12 puntos por cada día en mora; la trivia no lo compensa | `PARAMS_SCORE` |
| Interés moratorio | TEA × 1.5, prorrateada por día (interés simple) | `lib/reglas.ts` (`FACTOR_MORATORIO`) |
| **Modo Rescate** | 30 % menos de lo vencido hoy; ese descuento se recupera con +10 % en las 3 cuotas siguientes; vence en 7 días | `lib/reglas.ts` (`REGALO_SALVADOR`) |

- Al usar el Modo Rescate, el cliente queda al día, se detiene el CHICOTAZO y recupera sus beneficios. Solo aplica a clientes en mora sin un plan en marcha ni un Modo Rescate vigente.
- El cliente ya no arma planes de pago en la app: paga desde "Pagar hoy" y, si no le alcanza, pide ayuda a un gestor. Las reglas de reprogramación siguen en `lib/reglas.ts` para los planes existentes y para el gestor.

---

## Asistente Pareas

Todo lo que se filtra se responde **sin IA**, para no gastar tokens. El orden de filtros (`lib/asistente/`) es:

1. **Datos sensibles** (claves, tarjetas, tokens): responde con un aviso fijo, sin pasar el mensaje a la IA.
2. **Angustia o pedido de una persona**: deriva el caso al gestor.
3. **Intentos de sacarlo de su rol** ("ignora tus instrucciones", "actúa como…"): responde con una negativa fija.
4. **Temas ajenos a la Caja** (poemas, fútbol, tareas, código, política): responde con una negativa fija.
5. **Preguntas frecuentes** (deuda, vencimiento de cuota, pago con QR, puntos, Modo Rescate, interés, gastos): responde con una plantilla que usa las cifras del servidor.
6. **Solo si queda una pregunta del tema que nada de lo anterior resuelve**: consulta a la IA (OpenAI o Gemini).
   - Recibe las reglas y los hechos del cliente calculados en el servidor (`prompt.ts`).
   - Lee hasta 300 caracteres del mensaje y 4 turnos de historial, y responde con 150 tokens como máximo.
   - Tiene un cupo diario por cliente; los intentos fallidos no lo consumen.

El asistente habla siempre **de usted**.

---

## Seguridad

- **Sesión del gestor**: va firmada con HMAC-SHA256 y vence en 8 horas (`lib/sesion.ts`). `middleware.ts` protege `/banco` y `/api/banco`.
- **Bloqueo de acceso**: tras 5 intentos fallidos, la misma IP queda bloqueada 5 minutos (respuesta 429). La comparación es en tiempo constante. La cookie es `secure` cuando la app corre en https.
- **Datos del cliente**: el DNI se guarda solo como hash SHA-256 y se muestra enmascarado (`****0796`). La app no guarda claves, tarjetas ni DNIs completos.
- **Pendiente para la integración**: el inicio de sesión real, el 2FA o las passkeys, y los permisos los aporta la app de Caja Piura (SSO).

---

## Cartera en Excel

Se puede usar con los botones de *Cartera* en el panel del gestor o desde la consola:

```bash
npm run plantilla:xlsx                 # crea data/plantilla-cartera.xlsx
npm run importar:xlsx -- archivo.xlsx  # agrega clientes nuevos y actualiza los existentes
npm run export:xlsx                    # descarga la cartera actual a data/cartera.xlsx
```

- La importación actualiza por *ID sistema* o por DNI y nunca borra filas.
- Si en la columna "¿Ya pagó?" dice **Sí**, se registra el pago como hecho en agencia.
- El formato de columnas está en `lib/excel-cartera.ts` y la lógica en `importarCartera` (`lib/servicio.ts`).

---

## Rutas

### Páginas
| Ruta | Qué es |
|---|---|
| `/` | Portada con accesos a la app del cliente y al panel del gestor |
| `/cliente` | App del cliente (`?id=N` para otro cliente, `?ver=finanzas` para abrir Mis Finanzas) |
| `/banco/login` | Ingreso del gestor |
| `/banco` | Resumen |
| `/banco/cartera` | Cartera |
| `/banco/rescate` | Modo Rescate |
| `/banco/cliente/[id]` | Ficha de un cliente |

### API
| Método y ruta | Uso |
|---|---|
| `GET /api/cliente/[id]` | Situación del cliente (deuda, score, CHICOTAZO, campañas) |
| `GET /api/notificaciones?clienteId=` | Avisos del cliente |
| `GET` · `POST /api/finanzas` | Mis Finanzas: consulta, alta, edición y borrado |
| `GET` · `POST /api/pago` | Cobro con QR y pago |
| `GET /api/trivia` · `POST /api/trivia/responder` | Trivia del día |
| `POST /api/asistente` · `GET /api/asistente/estado` | Chat de Pareas y estado del proveedor de IA |
| `POST /api/ayuda` | El cliente pide ayuda a un gestor |
| `POST` · `DELETE /api/banco/login` | Iniciar y cerrar la sesión del gestor |
| `GET /api/banco/resumen` · `kpis` · `distribucion` · `derivados` · `feed` | Datos del Resumen |
| `GET /api/banco/cartera` · `GET /api/banco/cliente/[id]` | Cartera y ficha |
| `GET` · `POST /api/banco/rescate` | Vista previa y activación del Modo Rescate masivo |
| `POST /api/banco/regalo` | Modo Rescate individual |
| `GET` · `POST /api/banco/excel` | Descargar y subir la cartera en Excel |
| `POST /api/pruebas/reset` · `avanzar-dia` | Herramientas de prueba (404 si están apagadas) |

---

## Pruebas

```bash
npm test          # 99 pruebas unitarias: reglas, score, servicio, Mis Finanzas, Excel, sesión y asistente
npm run build     # incluye la verificación de tipos
```

Las pruebas de caja negra corren contra la app en marcha y con una base aparte (ver [`scripts/qa/README.md`](scripts/qa/README.md)):
- `api.mjs`: 71 casos de API;
- `interfaz.cjs`: 54 casos de interfaz en 320, 390 y 1366 px;
- `recorrido.cjs`: 11 pasos de punta a punta entre cliente y gestor.

El plan y el último diagnóstico están en [`docs/PLAN-DE-PRUEBAS.md`](docs/PLAN-DE-PRUEBAS.md).

---

## Video del pitch

`npm run video:pitch` graba un video de **3:00 exactos** (1920 × 1080) que recorre la plataforma real mientras el presentador expone. Muestra:
- el aviso del CHICOTAZO;
- Mis Finanzas;
- el chat con Pareas;
- el Modo Rescate masivo y el pago con QR;
- las cifras públicas del problema y el Business Model Canvas.

Instrucciones en [`scripts/video/README.md`](scripts/video/README.md).

---

## Despliegue

Un solo comando instala o actualiza PAREAS en un VPS con Ubuntu o Debian (por ejemplo, Hostinger). Se ejecuta desde su PC con su llave SSH:

```bash
ssh -t -i ~/.ssh/SU_LLAVE usuario@IP_DEL_VPS 'curl -fsSL https://raw.githubusercontent.com/laboratoryheod/PAREAS-CAJA-PIURA/master/scripts/deploy/instalar-vps.sh | sudo bash'
```

El instalador hace lo siguiente:
- Pregunta el dominio, las credenciales del gestor y la clave de OpenAI. Las claves se escriben en el servidor, no en el repositorio.
- Instala un Node.js propio y compila la app.
- Crea el servicio `pareas` (systemd).
- La publica con Nginx y, si hay dominio, con HTTPS de Let's Encrypt.

No toca otros sitios del servidor. Los detalles, la operación diaria y los respaldos están en [`docs/DESPLIEGUE-VPS.md`](docs/DESPLIEGUE-VPS.md).

---

## Dónde se ajusta cada cosa

| Qué | Archivo |
|---|---|
| Nombre de la app, apelativo del tono coloquial y herramientas de prueba | `lib/config.ts` (`APP_NOMBRE`, `APELATIVO`, `MOSTRAR_HERRAMIENTAS_PRUEBA` según `NEXT_PUBLIC_HERRAMIENTAS_PRUEBA`) |
| Reprogramación, interés moratorio, beneficios por nivel y Modo Rescate | `lib/reglas.ts` |
| Puntos del score y CHICOTAZO | `lib/score.ts` (`PARAMS_SCORE`) |
| Niveles | `lib/niveles.ts` |
| Atajos del Modo Rescate masivo | `lib/servicio.ts` (`ATAJOS_SCORE_RESCATE`) |
| Textos de las notificaciones del cliente | `lib/servicio.ts` (`notificacionesCliente`) |
| Mis Finanzas | `lib/finanzas.ts`, `lib/consejos-finanzas.ts`, `components/cliente/Finanzas.tsx` (ver [`MODULO_MIS_FINANZAS.md`](MODULO_MIS_FINANZAS.md)) |
| Blindaje, FAQ, reglas de la IA y cupos | `lib/asistente/` (`guardia.ts`, `faq.ts`, `prompt.ts`) |
| Columnas del Excel de cartera | `lib/excel-cartera.ts` |
| Inicio del cliente (widgets) | `components/cliente/inicio/` |
| Chat de Pareas | `components/cliente/ChatPareas.tsx` |
| Iconos | `components/iconos.tsx` |
| Pantalla de carga y sus frases | `components/PantallaCarga.tsx` (`FRASES_CARGA`) |
| Imágenes de Pareas y de la Caja | `public/pareas/`, `public/caja/`, `app/icon.png` y `app/apple-icon.png` |
| Acceso a datos | `lib/db/repo.ts` (interfaz) y `lib/db/repo-sqlite.ts` |

---

## Documentación relacionada
- [`docs/CONTEXTO-MAESTRO.md`](docs/CONTEXTO-MAESTRO.md): contexto completo para retomar el trabajo, con preferencias, reglas e historial de decisiones.
- [`AGENTS.md`](AGENTS.md): reglas para agentes de código. Se complementa con `.agents/rules/`, `.agents/workflows/` y `.agents/skills/`.
- [`DESIGN.md`](DESIGN.md): decisiones de diseño.
- [`MODULO_MIS_FINANZAS.md`](MODULO_MIS_FINANZAS.md): especificación de Mis Finanzas.
- [`docs/PLAN-DE-PRUEBAS.md`](docs/PLAN-DE-PRUEBAS.md): plan de pruebas y diagnóstico.
- [`docs/DESPLIEGUE-VPS.md`](docs/DESPLIEGUE-VPS.md): instalación y operación en un VPS.
- [`docs/MIGRAR-A-ANTIGRAVITY.md`](docs/MIGRAR-A-ANTIGRAVITY.md): cómo abrir el proyecto en Antigravity.

## Licencias de terceros
- Componentes de [cult-ui](https://github.com/nolly-studio/cult-ui) (MIT) en `components/ui/`.
- Fuente Plus Jakarta Sans (SIL Open Font License) en `app/fonts/`.
