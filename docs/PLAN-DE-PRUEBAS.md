# Plan de pruebas y diagnóstico — PAREAS

Fecha de ejecución: 11 de octubre de 2026. Las pruebas corrieron sobre el build de producción (`next build` + `next start`) con una base aparte.

## Resumen
| Suite | Qué cubre | Casos | Resultado inicial | Resultado final |
|---|---|---|---|---|
| Unitarias (`npm test`, Vitest) | reglas, score, servicio, Mis Finanzas, Excel, asistente | 90 | 85 de 85 (las 5 nuevas se agregaron con las correcciones) | **90 de 90** |
| API (`scripts/qa/api.mjs`) | cliente, pago, trivia, asistente, Mis Finanzas, fechas, seguridad, gestor, Excel, tiempos | 67 | 61 de 67 | **67 de 67** |
| Interfaz (`scripts/qa/interfaz.cjs`) | 320, 390 y 1366 px: desborde, barra, dock, avisos, Mis Finanzas, gestor, consola | 54 | 42 de 54 (incluye 6 falsos positivos de la propia prueba) | **54 de 54** |
| Recorrido completo (`scripts/qa/recorrido.cjs`) | cliente → trivia → gestor activa el Modo Rescate → cliente paga con QR → gestor lo ve → asistente | 11 | 11 de 11 (dejó ver el bug 12) | **11 de 11** |

**Diagnóstico final:** la app está estable. Se encontraron **12 bugs** y todos están corregidos y cubiertos por pruebas. No hay errores de consola ni de hidratación, ni desbordes horizontales en celulares de 320 px. Las respuestas del servidor tardan entre 5 y 100 ms. Al final del documento quedan recomendaciones para el paso a producción que no son bugs del módulo.

## Casos de prueba
### Cliente y pagos
| Id | Caso | Esperado |
|---|---|---|
| CLI-01 | Situación de Gengis | En mora, 12 días, S/ 326.08, score 70 |
| CLI-02…04 | Id inexistente, no numérico o negativo | 404 / 400 con mensaje |
| PAG-01 | Pago con concepto desactualizado | Rechazado ("El pago pendiente cambió") |
| PAG-02/03 | Pagar la deuda y volver a pagar | Queda al día; el segundo intento responde "Está al día" |
| PAG-04 | JSON mal formado | 400, nunca 500 |
| NOT-01…03 | Notificaciones: mora y trivia, con CHICOTAZO; sin `clienteId` | Correctas; 400 sin id |

### Trivia y asistente
| Id | Caso | Esperado |
|---|---|---|
| TRI-01 | Pedir pregunta | Pregunta con opciones; la respuesta correcta no viaja al navegador |
| TRI-02 | Opción fuera de rango (99) | 400 y la pregunta sigue disponible |
| TRI-03/04 | Responder y repetir la respuesta | Se acepta una vez; la segunda vez se rechaza |
| ASI-01…05 | Deuda con cifras del servidor, intento de inyección, clave, mensaje de 20 000 caracteres, mensaje vacío | Responde bien o rechaza sin usar IA; nunca da 500 |

### Mis Finanzas
| Id | Caso | Esperado |
|---|---|---|
| FIN-01 | Fórmula del resumen | Sobra = ingresos − gastos − cuota − vencido |
| FIN-02/03 | Próxima cuota y consejos | Fecha futura y días que faltan; como máximo 3 consejos |
| FIN-04 | Monto "1,234.50" | Se acepta como 1234.50 |
| FIN-05…07 | 3 decimales, negativo, nombre vacío | Error con mensaje amable |
| FIN-08/09 | Fecha futura o imposible (30 de febrero) | Rechazada |
| FIN-10 | Categoría inexistente | Rechazada |
| FIN-11/12 | Ingreso "una sola vez" y paso al mes siguiente | Cuenta solo en su mes |
| FIN-13/14 | Borrar el gasto de otro cliente; acción desconocida | Rechazado |

### Fechas
| Id | Caso | Esperado |
|---|---|---|
| FEC-01 | Fecha del sistema | Fecha real de Perú |
| FEC-02/03 | Pasar un día y volver a consultar | +1 día de atraso y −12 una sola vez |
| FEC-04 | Reiniciar | Vuelve a la fecha real y al estado inicial |
| Migración | Base antigua con `fecha_demo` del 10 de octubre | Cobra los días que pasaron (13 días, score 58) |

### Seguridad y gestor
| Id | Caso | Esperado |
|---|---|---|
| SEG-01…06 | API y páginas sin sesión, clave mala, cookie falsa, login y salir | 401 / redirección al login; cookie httpOnly que se borra al salir |
| GES-01…03 | Resumen, gráfico y filtro sin resultados | Los grupos suman el total; sin división entre cero |
| GES-04…10 | Modo Rescate: vista previa, mínimo inválido o mayor a 100, campaña masiva, repetición, solo clientes con score ≥ mínimo, doble otorgamiento | Correctos; nunca se duplica una campaña |
| GES-11…13 | Búsqueda sin tildes, con caracteres especiales; detalle del cliente | Correctos |
| XLS-01…09 | Plantilla, descarga, acceso sin sesión, subir dos veces, archivo que no es Excel, sin archivo, más de 5 MB, subir la cartera sin cambios | Correctos; subir la cartera sin cambios no registra pagos |
| REN-01 | Tiempos de respuesta | Menos de 300 ms |

### Interfaz (en 320, 390 y 1366 px)
- Landing, inicio, Mis Finanzas y las 4 páginas del gestor sin scroll horizontal.
- Barra superior: nada se sale de la pantalla. Dock: las 5 pestañas visibles.
- Avisos: un banner a la vez y ninguno con el centro abierto. Escape cierra el centro y los formularios.
- Mis Finanzas: botones de 44 px o más y letra de 15 px o más.
- Sin emojis. Sin errores de consola ni de hidratación.

## Bugs encontrados y corregidos
| # | Severidad | Bug | Corrección |
|---|---|---|---|
| 1 | **Alta** | Las rutas de prueba `/api/pruebas/reset` y `avanzar-dia` seguían activas con `MOSTRAR_HERRAMIENTAS_PRUEBA = false`: en producción, cualquiera podía borrar la base o adelantar la fecha. | Ahora responden 404 si las herramientas están apagadas. |
| 2 | **Alta** | Un ingreso "una sola vez" (por ejemplo, un bono) se sumaba **todos los meses**, lo que inflaba lo que le sobra al cliente. | Los ingresos guardan su fecha. El de una sola vez cuenta solo en su mes y los que se repiten, desde su mes. Las bases existentes se migran solas. |
| 3 | Media | La trivia aceptaba una opción inexistente: la contaba como error y la pregunta se perdía. | Se valida que la opción exista y la pregunta sigue disponible. |
| 4 | Media | Mis Finanzas aceptaba gastos con fecha futura. Como el gasto no era del mes, "desaparecía" de la lista y parecía que no se había guardado. | Se rechazan las fechas posteriores a hoy (servidor y campo) y las de más de 12 meses atrás. |
| 5 | Media | Se aceptaban fechas imposibles (30 de febrero → se guardaba como 2 de marzo). | Validación estricta del calendario. |
| 6 | Media | "1,234.50" se rechazaba con un mensaje confuso ("Escriba un monto mayor a cero"). | Se leen montos con separador de miles ("1,234.50", "1.234,50", "S/ 2 400"). "12.345" sigue pidiendo 2 decimales, para no confundir montos. |
| 7 | Media | Una base creada con la fecha fija antigua (clave `fecha_demo`) no recuperaba los días transcurridos: se perdían la mora y los CHICOTAZOS de esos días. | La migración también reconoce `fecha_demo`. |
| 8 | Baja | Se podía "editar" un gasto o ingreso con un id inexistente sin aviso. | Responde "No encontramos ese gasto/ingreso". |
| 9 | Baja | Escape no cerraba el centro de notificaciones ni los formularios de Mis Finanzas. | Escape los cierra. |
| 10 | Baja | La campana (36 px), la píldora de avisos y el enlace "¿Dudas?" tenían un área táctil menor a 44 px. | Ahora miden 44–48 px. |
| 11 | Baja | El asistente todavía ofrecía ayuda con "su plan de pago", aunque el cliente ya no arma planes. | Textos actualizados ("sus pagos, sus finanzas"). |
| 12 | Baja | En el detalle del cliente, el gestor veía códigos internos ("al_dia", "ACEPTADA", "ofrecida"). | Ahora se muestran textos legibles: "Al día", "Aceptada", "Vigente". |

Además, el formateador de fecha de Perú ahora se crea una sola vez, en lugar de uno nuevo en cada consulta.

## Recomendaciones antes de producción (no aplicadas)
1. **Identidad del cliente:** las APIs del cliente (`/api/cliente/[id]`, `/api/finanzas`, `/api/pago`…) confían en el `clienteId` que llega en la petición. Al integrarse, el id debe salir de la sesión de la app de Caja Piura (SSO), nunca del navegador.
2. **Login del gestor:** (aplicado) sesión firmada con vencimiento y bloqueo tras 5 intentos. Falta la doble verificación (2FA) del SSO de la Caja. Configure `SESION_SECRETO` en `.env.local` para producción.
3. **Nuevas cuotas:** con la fecha real, un cliente al día no "cae" en mora por sí solo, porque la base local no genera cuotas futuras. En producción, las cuotas las entrega el core bancario mediante `Repo`.
4. **Herramientas de prueba:** antes de publicar, poner `MOSTRAR_HERRAMIENTAS_PRUEBA = false`, lo que ahora también apaga sus rutas.
5. **Importación de Excel:** no se puede deshacer. Si se necesita, agregar un historial de importaciones.
