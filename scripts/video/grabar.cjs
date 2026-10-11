// Graba el video del pitch de PAREAS (3:00 exactos) recorriendo la plataforma real.
// Requiere la app en marcha (npm run build && npx next start), Playwright y ffmpeg. Ver scripts/video/README.md.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const B = process.env.VIDEO_URL ?? "http://localhost:3130";
const SALIDA = path.resolve(process.env.VIDEO_SALIDA ?? "video-pitch");
const CUADROS = path.join(SALIDA, "cuadros");
const GUION = JSON.parse(fs.readFileSync(path.join(__dirname, "guion.json"), "utf8"));
const DUR = GUION.duracion;
const RAIZ = path.resolve(__dirname, "../..");

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  fs.rmSync(CUADROS, { recursive: true, force: true });
  fs.mkdirSync(CUADROS, { recursive: true });

  // 1. Estado inicial de la cartera de ejemplo
  await fetch(B + "/api/pruebas/reset", { method: "POST" });
  const sit = await (await fetch(B + "/api/cliente/1")).json();

  const br = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const ctx = await br.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, locale: "es-PE", timezoneId: "America/Lima" });
  await ctx.request.post(B + "/api/banco/login", { data: { usuario: "gestor", clave: "caja2026" } });
  // Sin hoja de bienvenida; avisos apagados (se encienden en cámara) y la trivia ya avisada
  await ctx.addInitScript((hoy) => {
    try {
      if (location.pathname.startsWith("/cliente") && !sessionStorage.getItem("video-listo")) {
        localStorage.setItem("pareas-bienvenida-1", "1");
        localStorage.setItem("pareas-notificaciones", "0");
        localStorage.setItem("pareas-notif-vistas", JSON.stringify(["trivia-" + hoy]));
        sessionStorage.setItem("video-listo", "1");
      }
    } catch { /* sin almacenamiento */ }
  }, sit.fechaHoy);

  // 2. Escenario servido en el mismo origen que la app (así se puede tocar la app dentro de los marcos)
  const rotulos = Object.fromEntries(GUION.escenas.filter((e) => e.rotulo).map((e) => [e.id, e.rotulo]));
  const html = fs.readFileSync(path.join(__dirname, "escenario.html"), "utf8")
    .replace("<script>", `<script>window.ROTULOS = ${JSON.stringify(rotulos)};</script>\n<script>`);
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await page.route(B + "/__escenario", (r) => r.fulfill({ contentType: "text/html; charset=utf-8", body: html }));
  await page.route(B + "/__escenario/fuente.woff2", (r) => r.fulfill({ contentType: "font/woff2", body: fs.readFileSync(path.join(RAIZ, "app/fonts/plus-jakarta-sans-latin.woff2")) }));
  await page.goto(B + "/__escenario");
  await page.evaluate(() => document.fonts.ready);

  const cel = page.frameLocator("#app-cel");
  const lap = page.frameLocator("#app-lap");
  // Precarga: Mis Finanzas y el panel del gestor quedan en caché antes de grabar
  await page.evaluate(() => { document.getElementById("app-cel").src = "/cliente?ver=finanzas"; document.getElementById("app-lap").src = "/banco/rescate"; });
  await cel.locator("text=Lo que gano al mes").waitFor({ timeout: 30000 });
  await lap.locator("text=Campaña masiva por puntos").waitFor({ timeout: 30000 });
  await page.evaluate(() => { document.getElementById("app-cel").src = "/cliente"; document.getElementById("app-lap").src = "/banco"; });
  await cel.locator("text=Hola, Gengis").waitFor({ timeout: 30000 });
  await lap.locator("text=Situación de la cartera").waitFor({ timeout: 30000 });
  await page.evaluate(() => { E.limpiar("app-cel"); E.limpiar("app-lap"); });
  await esperar(2500);

  // 3. Captura de pantalla continua (CDP screencast) a disco
  const cdp = await ctx.newCDPSession(page);
  const marcas = [];
  let n = 0;
  cdp.on("Page.screencastFrame", (f) => {
    n++;
    const nombre = `c${String(n).padStart(6, "0")}.jpg`;
    fs.writeFileSync(path.join(CUADROS, nombre), Buffer.from(f.data, "base64"));
    marcas.push({ nombre, t: f.metadata.timestamp });
    cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  await esperar(600);

  // 4. Guion de acciones (segundos desde el inicio del video)
  const toque = (marco, sel, texto) => page.evaluate(([m, s, t]) => E.toque(m, s, t), [marco, sel, texto]);
  const desplazar = (marco, sel, texto, margen, ms) => page.evaluate(([m, s, t, g, d]) => E.desplazar(m, s, t, g, d), [marco, sel, texto, margen, ms]);
  const escena = (id) => page.evaluate((x) => E.escena(x), id);
  let elegibles = "";
  const ACC = [
    [0, () => escena("E1")],
    [12, () => escena("E2")],
    [28, () => escena("E3")],
    [52, () => escena("E4")],
    [72, () => escena("E5")],
    [86, () => desplazar("app-cel", null, null, 0, 300)],
    [87, () => escena("E6")],
    [88.8, () => toque("app-cel", "button[aria-label='Activar notificaciones']")],
    [94.2, () => desplazar("app-cel", "span", "Pareas está pegando", 260, 1600)],
    [99, () => escena("E7")],
    [99.6, () => toque("app-cel", "nav[aria-label='Secciones'] button[aria-label='Finanzas']")],
    [105.2, () => desplazar("app-cel", "h2, h3, p", "Consejos para usted", 110, 1800)],
    [111, () => escena("E8")],
    [111.5, () => toque("app-cel", "button[aria-label='Abrir chat con Pareas']")],
    [112.9, () => cel.locator("input[aria-label='Su consulta para Pareas']").pressSequentially("¿Cuánto debo?", { delay: 65 })],
    [114.3, () => cel.locator("input[aria-label='Su consulta para Pareas']").press("Enter")],
    [118.6, () => toque("app-cel", "button[aria-label='Cerrar chat']")],
    [119, () => escena("E9")],
    [120.2, () => toque("app-lap", "nav a, nav button", "Modo Rescate")],
    [122.8, () => toque("app-lap", "[aria-label='Score mínimo rápido'] button", "60 pts")],
    [124.6, async () => { elegibles = (await page.evaluate(() => E.textoDe("app-lap", "button", "Activar a"))).match(/\d+/)?.[0] ?? ""; return !!elegibles; }],
    [125.0, () => toque("app-lap", "button", "Activar a")],
    [126.6, () => toque("app-lap", "button", "Confirmar")],
    [127.6, () => page.evaluate((n) => E.aviso(`Modo Rescate activado a ${n} clientes, en un clic`, 700, 820), elegibles)],
    [130, () => escena("E10")],
    [130.4, () => toque("app-cel", "nav[aria-label='Secciones'] button[aria-label='Inicio']")],
    [133.2, () => toque("app-cel", "button", "Usar mi Modo Rescate")],
    [135.4, () => desplazar("app-cel", "button", "Pagar ahora", 520, 900)],
    [136.8, () => toque("app-cel", "button", "Pagar ahora")],
    [138.2, () => page.evaluate(() => E.aviso("Gengis quedó al día y recuperó sus beneficios", 120, 720, 1700))],
    [140, () => escena("E11")],
    [155, () => escena("E12")],
    [170, () => escena("E13")],
  ];
  const t0 = Date.now();
  const cdpT0 = await page.evaluate(() => { E.iniciar(); return Date.now() / 1000; });
  const bitacora = [];
  for (const [t, fn] of ACC) {
    const falta = t0 + t * 1000 - Date.now();
    if (falta > 0) await esperar(falta);
    const real = (Date.now() - t0) / 1000;
    let ok = true;
    try { const r = await fn(); if (r === false) ok = false; } catch (e) { ok = false; errores.push(`t=${t}: ${e.message.split("\n")[0]}`); }
    bitacora.push(`${t.toFixed(1).padStart(6)}s → ${real.toFixed(2).padStart(7)}s ${ok ? "ok" : "FALLÓ"}`);
  }
  const falta = t0 + DUR * 1000 + 400 - Date.now();
  if (falta > 0) await esperar(falta);
  await cdp.send("Page.stopScreencast");
  await esperar(300);
  await br.close();

  // 5. Video a 30 cuadros por segundo con la duración exacta
  const lista = [];
  const desde = marcas.findIndex((m) => m.t >= cdpT0 - 0.05);
  const usados = marcas.slice(Math.max(0, desde - 1));
  for (let i = 0; i < usados.length; i++) {
    const ini = Math.max(usados[i].t, cdpT0);
    const fin = i + 1 < usados.length ? usados[i + 1].t : cdpT0 + DUR + 0.5;
    if (fin <= ini) continue;
    lista.push(`file '${path.join(CUADROS, usados[i].nombre)}'`, `duration ${(fin - ini).toFixed(4)}`);
  }
  lista.push(`file '${path.join(CUADROS, usados[usados.length - 1].nombre)}'`);
  fs.writeFileSync(path.join(SALIDA, "cuadros.txt"), lista.join("\n"));
  const mp4 = path.join(SALIDA, "pareas-pitch-3min.mp4");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", path.join(SALIDA, "cuadros.txt"),
    "-vf", "fps=30,format=yuv420p", "-t", String(DUR), "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-movflags", "+faststart", mp4], { stdio: "inherit" });

  // 6. Subtítulos con el guion (para ensayar) y versión con subtítulos incrustados
  const tc = (s) => { const ms = Math.round(s * 1000); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, ss = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`; };
  const bloques = [];
  for (const e of GUION.escenas) {
    if (!e.texto) continue;
    // Se reparte el texto de la escena en frases, con un tiempo proporcional a sus palabras
    const frases = e.texto.match(/[^.?]+[.?]+»?|[^.?]+$/g).map((f) => f.trim()).filter(Boolean);
    const total = frases.reduce((a, f) => a + f.split(/\s+/).length, 0);
    let t = e.inicio + 0.2;
    const util = Math.min(e.fin, e.habla_hasta ?? e.fin) - e.inicio - 0.4;
    for (const f of frases) { const d = util * (f.split(/\s+/).length / total); bloques.push([t, t + d, f]); t += d; }
  }
  const srt = bloques.map(([a, b, f], i) => `${i + 1}\n${tc(a)} --> ${tc(b)}\n${f}\n`).join("\n");
  const rutaSrt = path.join(SALIDA, "pareas-pitch-guion.srt");
  fs.writeFileSync(rutaSrt, srt);
  if (bloques.length) {
    const estilo = "FontName=Plus Jakarta Sans,FontSize=13,PrimaryColour=&H00FFFFFF,OutlineColour=&H80000000,BackColour=&HB0000000,BorderStyle=3,Outline=1,Shadow=0,MarginV=24,Bold=1";
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", mp4,
      "-vf", `subtitles=${rutaSrt.replace(/:/g, "\\:")}:fontsdir=${path.join(RAIZ, "app/fonts")}:force_style='${estilo}'`,
      "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-movflags", "+faststart", path.join(SALIDA, "pareas-pitch-3min-ensayo.mp4")], { stdio: "inherit" });
  }

  console.log(bitacora.join("\n"));
  console.log(`\nCuadros capturados: ${marcas.length} (${(usados.length / DUR).toFixed(1)} por segundo)`);
  if (errores.length) console.log("Avisos:\n- " + errores.join("\n- "));
  console.log(`Listo: ${mp4}`);
})().catch((e) => { console.error("ERROR:", e); process.exit(1); });
