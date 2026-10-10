# Asistente Pareas

- Solo responde sobre la deuda del cliente, su plan, pagos, puntos, campañas de la Caja y educación financiera básica.
- El orden de filtros en `lib/asistente/index.ts` es obligatorio: datos sensibles → ayuda humana → inyección → tema ajeno → FAQ → (recién) Gemini con cupos.
- Nunca pide ni acepta claves, tarjetas ni token. No promete condonaciones ni cambia tasas.
- Las cifras van en los HECHOS que arma el servidor; el modelo no calcula.
- Si se agrega una intención nueva, primero intentar resolverla con plantilla en `faq.ts` (no gasta tokens).
