# Pruebas de calidad (QA)

Además de las pruebas unitarias (`npm test`), aquí están las pruebas de caja negra contra la app en marcha.
**Use siempre una base aparte:** las pruebas reinician la base varias veces.

```bash
SQLITE_PATH=/tmp/qa.db npm run build
SQLITE_PATH=/tmp/qa.db npx next start -p 3120     # en otra terminal

node scripts/qa/api.mjs                           # 71 casos de API (sin dependencias)
npm i -D playwright                               # una vez, para las dos siguientes
node scripts/qa/interfaz.cjs                      # 54 casos de interfaz en 320, 390 y 1366 px
node scripts/qa/recorrido.cjs                     # 11 pasos de punta a punta (cliente + gestor)
```

Variables: `QA_URL` (por defecto `http://localhost:3120`) y `CHROMIUM_PATH` (navegador propio para Playwright).
Requieren `MOSTRAR_HERRAMIENTAS_PRUEBA = true` (usan Reiniciar y Pasar un día).
El plan completo y los resultados están en `docs/PLAN-DE-PRUEBAS.md`.
