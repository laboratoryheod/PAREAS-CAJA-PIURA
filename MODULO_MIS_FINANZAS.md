# Módulo "Mis Finanzas" — calculadora de ingresos y gastos

Reemplaza a "Mi plan" en la app del cliente. Ayuda al cliente a ordenar su dinero y le recuerda que, además de sus gastos, debe pagar su crédito.

## Qué hace
- **Resumen del mes** (tarjeta grande): lo que gana − sus gastos − la cuota de su crédito − su deuda vencida (o su Modo Rescate) = lo que le sobra. El monto se muestra con un **semáforo**:
  - verde, si sobra más del 20 % del ingreso;
  - amarillo, si sobra entre el 5 % y el 20 %;
  - rojo, si sobra menos del 5 % o el resultado es negativo.

  Si el dinero no alcanza para el crédito, aparece una alerta.
- **Mi crédito:** próxima cuota, su fecha de vencimiento y los días que faltan. Si hay deuda vencida, ofrece el botón "Pagar mi deuda".
- **Consejos automáticos** (hasta 3, sin IA). Cada uno tiene un botón de acción: Pagar mi deuda, Hablar con un asesor, Ver mis gastos o Agregar ingreso.
- **Gráfico de barras** de los gastos por categoría, con el texto, el monto y el porcentaje de cada una.
- **Ingresos:** sueldo, ventas u otros, con su frecuencia (una sola vez, cada semana, cada quincena o cada mes). Se convierten a su equivalente mensual (cada semana × 52/12, cada quincena × 2).
- **Gastos:**
  - Cada gasto tiene nombre, monto, categoría, fecha (por defecto, hoy), si es **fijo** o **variable**, y si es **de la casa** o **del negocio**.
  - Los fijos se repiten cada mes; los variables solo cuentan en su mes.
  - Se pueden editar, y para borrar se pide confirmación ("¿Seguro que quiere borrarlo?").
  - La lista se agrupa por categoría con su subtotal y se puede filtrar en Todos, De mi casa o Del negocio.
- **Categorías:** Alimentación, Vivienda y servicios, Transporte, Salud, Educación, Negocio, Deudas y otros créditos, y Otros. El cliente puede crear hasta 12 **etiquetas propias**, cada una con su color y su dibujo.
- **Pensado para adultos mayores:**
  - letra de 16–40 px y botones de 48 px o más;
  - una acción principal ("Agregar gasto");
  - íconos siempre acompañados de texto y lenguaje simple, de usted;
  - mensajes de error que explican cómo corregir;
  - etiquetas para lector de pantalla.
- **Seguridad:** muestra el aviso "Caja Piura nunca le pedirá su clave por mensaje o llamada". No se piden claves, tarjetas ni DNI.

## Dónde está
| Capa | Archivo |
|---|---|
| Modelos y cálculos puros (totales, mensualización, semáforo, validaciones) | `lib/finanzas.ts` |
| Motor de consejos (reglas, máximo 3) | `lib/consejos-finanzas.ts` |
| Lógica de negocio: crédito del cliente, alta, edición y baja | `lib/servicio.ts` → `cuotaParaFinanzas`, `finanzasCliente`, `accionFinanzas` |
| Almacenamiento (aislado detrás de `Repo`) | `lib/db/repo.ts` (interfaz) · `lib/db/repo-sqlite.ts` · tablas `fin_ingresos`, `fin_gastos` y `fin_categorias` en `lib/db/schema.sql` |
| API | `GET /api/finanzas?clienteId=` · `POST /api/finanzas` `{ clienteId, accion, datos }` |
| Pantalla | `components/cliente/Finanzas.tsx` (pestaña "Finanzas" del dock y fila "Mis Finanzas" en Pagos y juegos) |
| Pruebas | `tests/finanzas.test.ts` |

Siguiendo la regla de la app, **todo se calcula en el servidor**: el navegador solo muestra lo que devuelve `/api/finanzas`. Los datos se guardan en la base del módulo (SQLite), no en el navegador.

## Cómo probarlo
- `npm run dev` y abra `/cliente`, pestaña **Finanzas**. Gengis (cliente 1) ya trae ingresos y gastos de ejemplo.
- `npm test` corre, entre otras, las pruebas de los cálculos, del semáforo, de los consejos y de las altas, ediciones y bajas.

## Qué falta para el backend real
1. **Crédito:** `cuotaParaFinanzas` arma la próxima cuota y lo vencido con la base local. Al conectar el core (y su calculadora de mora), basta con devolver la misma forma `CuotaCredito` (`lib/finanzas.ts`).
2. **Almacenamiento:** implementar los métodos de Mis Finanzas de `Repo` (`ingresos`, `guardarIngreso`, `gastos`, `guardarGasto`, `categoriasPropias`…) contra el backend de la Caja.
3. **Sesión:** hoy el cliente se identifica con `clienteId` (como el resto del módulo). En producción, el id debe salir de la sesión de la app de Caja Piura.

## Suposiciones
- El mes del resumen es el mes de la fecha del sistema (fecha real de Perú).
- La "cuota de mi crédito" es la próxima cuota regular, o el siguiente pago del plan si tiene uno. La deuda vencida se resta aparte porque debe pagarse ya.
- El texto "Hablar con un asesor" usa el mismo pedido de ayuda humana que ya ve el gestor ("Pidió hablar con un gestor").
