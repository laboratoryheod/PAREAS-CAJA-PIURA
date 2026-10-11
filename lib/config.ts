// Nombre provisional de la app: cámbielo aquí y se actualiza en todo el módulo.
export const APP_NOMBRE = "PAREAS";
export const APP_ENTIDAD = "Caja Piura";

// TONO: la app usa lenguaje formal (de usted). Solo el JUEGO DE LA TRIVIA usa tono coloquial del norte,
// con este apelativo (se cambia aquí, p. ej. "causa" si se prefiere uno neutro).
export const APELATIVO = "compare";

// HERRAMIENTAS DE PRUEBA (botón "Reiniciar" y "Pasar un día"). Encendidas por defecto; para apagarlas en producción,
// compile con NEXT_PUBLIC_HERRAMIENTAS_PRUEBA=0 en .env.local (las rutas /api/pruebas/* responden 404).
export const MOSTRAR_HERRAMIENTAS_PRUEBA = process.env.NEXT_PUBLIC_HERRAMIENTAS_PRUEBA !== "0";
