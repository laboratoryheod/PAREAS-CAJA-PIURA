# Video del pitch de PAREAS

Graba un video de **3:00 exactos** (1920 × 1080, 30 cuadros por segundo) que recorre la plataforma real mientras el presentador dice el guion en vivo. No usa diapositivas: el celular del cliente y el panel del gestor que se ven en pantalla son la app funcionando, con la cartera de ejemplo.

## Archivos
- `escenario.html`: la escena de 1920 × 1080 (celular, laptop, contador de pérdidas, rótulos, lienzo BMC y cifras con sus fuentes).
- `guion.json`: tiempos de cada escena, texto que dice el presentador y rótulos de las escenas con la plataforma. Para cambiar textos, edite este archivo y vuelva a grabar.
- `grabar.cjs`: abre la app en Chromium, ejecuta las acciones a su segundo exacto (avisos, Mis Finanzas, chat, Modo Rescate, pago con QR), captura la pantalla y arma el MP4 con ffmpeg.

## Cómo grabar
Requisitos: Node 20+, ffmpeg y Playwright con Chromium (`npm i -g playwright && npx playwright install chromium`).

```bash
npm run build
SQLITE_PATH=/tmp/video.db npx next start -p 3130      # en otra terminal
NODE_PATH=$(npm root -g) npm run video:pitch
```

Variables opcionales: `VIDEO_URL` (por defecto `http://localhost:3130`), `VIDEO_SALIDA` (carpeta de salida, por defecto `video-pitch/`) y `CHROMIUM_PATH`.

La grabación reinicia la cartera de ejemplo (usa la herramienta de prueba `/api/pruebas/reset`, así que `MOSTRAR_HERRAMIENTAS_PRUEBA` debe estar en `true`). Los botones de prueba se ocultan en el video.

## Resultado
- `pareas-pitch-3min.mp4`: video para proyectar.
- `pareas-pitch-3min-ensayo.mp4`: el mismo video con el guion como subtítulos, para ensayar.
- `pareas-pitch-guion.srt`: subtítulos del guion por separado.

Al terminar, la consola muestra a qué segundo se ejecutó cada acción y cuántos cuadros por segundo se capturaron.
