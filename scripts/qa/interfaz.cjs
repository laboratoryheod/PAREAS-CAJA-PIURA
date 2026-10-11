// Pruebas de interfaz en 320, 390 y 1366 px (requiere Playwright: npm i -D playwright). Ver scripts/qa/README.md.
const { chromium } = require("playwright");
const B = process.env.QA_URL ?? "http://localhost:3120";
const EMOJI = /\p{Extended_Pictographic}/u;
const res = [];
const caso = (id, nombre, ok, det = "") => res.push({ id, nombre, ok: !!ok, det });
(async () => {
  const br = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  await fetch(B + "/api/pruebas/reset", { method: "POST" });
  for (const [n, vp] of [["320", { width: 320, height: 640 }], ["390", { width: 390, height: 844 }], ["1366", { width: 1366, height: 900 }]]) {
    const ctx = await br.newContext({ viewport: vp });
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", (e) => errs.push(e.message));
    p.on("console", (m) => { if (m.type() === "error" || /hydrat/i.test(m.text())) errs.push(m.text().slice(0, 160)); });
    // Landing
    await p.goto(B + "/"); await p.waitForTimeout(1500);
    let ancho = await p.evaluate(() => document.documentElement.scrollWidth);
    caso(`UI-${n}-01`, `Landing sin scroll horizontal (${n} px)`, ancho <= vp.width, `scrollWidth ${ancho}`);
    caso(`UI-${n}-02`, "Landing sin emojis", !EMOJI.test(await p.evaluate(() => document.body.innerText)));
    // Cliente
    await p.goto(B + "/cliente"); await p.waitForSelector("[role=dialog]", { timeout: 15000 }); await p.waitForTimeout(500);
    await p.click("[role=dialog] >> text=Comenzar"); await p.waitForTimeout(700);
    ancho = await p.evaluate(() => document.documentElement.scrollWidth);
    caso(`UI-${n}-03`, "Inicio del cliente sin scroll horizontal", ancho <= vp.width, `scrollWidth ${ancho}`);
    // Header: que nada se salga ni se superponga
    const hdr = await p.evaluate(() => { const h = document.querySelector("header"); const r = h.getBoundingClientRect(); const hijos = [...h.querySelectorAll("a,button,img")].map((e) => e.getBoundingClientRect()); return { alto: r.height, fuera: hijos.filter((x) => x.right > window.innerWidth + 1 || x.left < -1).length }; });
    caso(`UI-${n}-04`, "Barra superior: nada se sale de la pantalla", hdr.fuera === 0 && hdr.alto < 80, JSON.stringify(hdr));
    // Dock: todos visibles
    const dock = await p.evaluate(() => [...document.querySelectorAll("nav[aria-label=Secciones] button")].map((b) => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth; }));
    caso(`UI-${n}-05`, "Dock: todas las pestañas visibles", dock.length >= 4 && dock.every(Boolean), `${dock.length} pestañas, visibles ${dock.filter(Boolean).length}`);
    // Notificaciones
    await p.click("[aria-label='Activar notificaciones']"); await p.waitForTimeout(1200);
    const banner = await p.locator("button[role=status]").count();
    caso(`UI-${n}-06`, "Activar avisos muestra un banner (sin abrir el centro)", banner === 1 && (await p.locator("[aria-label='Centro de notificaciones']").count()) === 0, `banners ${banner}`);
    await p.click("[aria-label^='Notificaciones (']"); await p.waitForTimeout(600);
    caso(`UI-${n}-07`, "Con el centro abierto no hay banners encima", (await p.locator("button[role=status]").count()) === 0);
    await p.keyboard.press("Escape"); await p.waitForTimeout(900);
    const abiertoTrasEsc = await p.locator("[aria-label='Centro de notificaciones']").count();
    caso(`UI-${n}-08`, "Escape cierra el centro de notificaciones", abiertoTrasEsc === 0, `abierto ${abiertoTrasEsc}`);
    if (abiertoTrasEsc) { await p.click("[aria-label='Cerrar']"); await p.waitForTimeout(400); }
    // Mis Finanzas
    await p.click("nav[aria-label=Secciones] button >> nth=2").catch(() => {});
    await p.goto(B + "/cliente?ver=finanzas"); await p.waitForSelector("text=Lo que gano al mes", { timeout: 15000 }); await p.waitForTimeout(500);
    ancho = await p.evaluate(() => document.documentElement.scrollWidth);
    caso(`UI-${n}-09`, "Mis Finanzas sin scroll horizontal", ancho <= vp.width, `scrollWidth ${ancho}`);
    const peque = await p.evaluate(() => [...document.querySelectorAll("main button")].filter((b) => !b.closest("header, nav, [role=dialog]")).filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 44 && b.offsetParent; }).map((b) => (b.getAttribute("aria-label") || b.innerText).slice(0, 25)));
    caso(`UI-${n}-10`, "Mis Finanzas: botones de 44 px o más", peque.length === 0, peque.slice(0, 6).join(" | "));
    const letra = await p.evaluate(() => [...document.querySelectorAll("main p, main span, main button, main dt, main dd")].filter((e) => !e.closest("header, nav")).filter((e) => e.offsetParent && e.innerText.trim() && parseFloat(getComputedStyle(e).fontSize) < 15).map((e) => e.innerText.slice(0, 20)));
    caso(`UI-${n}-11`, "Mis Finanzas: letra de 15 px o más", letra.length === 0, letra.slice(0, 6).join(" | "));
    await p.click("button:has-text('Agregar gasto') >> nth=0"); await p.waitForSelector("text=¿En qué gastó?");
    await p.keyboard.press("Escape"); await p.waitForTimeout(900);
    caso(`UI-${n}-12`, "Escape cierra el formulario de gasto", (await p.locator("text=¿En qué gastó?").count()) === 0);
    caso(`UI-${n}-13`, "Sin errores de consola ni de hidratación (cliente)", errs.length === 0, errs.slice(0, 3).join(" | "));
    // Gestor
    const g = await ctx.newPage(); const gerr = [];
    g.on("pageerror", (e) => gerr.push(e.message)); g.on("console", (m) => { if (m.type() === "error" || /hydrat/i.test(m.text())) gerr.push(m.text().slice(0, 160)); });
    await g.goto(B + "/banco/login"); await g.fill("input >> nth=0", "gestor"); await g.fill("input[type=password]", "caja2026"); await g.keyboard.press("Enter");
    await g.waitForSelector("text=Situación de la cartera", { timeout: 15000 }); await g.waitForTimeout(800);
    for (const [ruta, txt, k] of [["/banco", "Situación de la cartera", "Resumen"], ["/banco/cartera", "Cartera en Excel", "Cartera"], ["/banco/rescate", "Campaña masiva por puntos", "Modo Rescate"], ["/banco/cliente/1", "Volver a la cartera", "Detalle"]]) {
      await g.goto(B + ruta); await g.waitForSelector(`text=${txt}`, { timeout: 15000 }); await g.waitForTimeout(600);
      const a = await g.evaluate(() => document.documentElement.scrollWidth);
      caso(`UI-${n}-G-${k}`, `Gestor ${k}: carga y sin scroll horizontal`, a <= vp.width, `scrollWidth ${a}`);
    }
    caso(`UI-${n}-G-err`, "Sin errores de consola (gestor)", gerr.length === 0, gerr.slice(0, 3).join(" | "));
    await ctx.close();
  }
  for (const x of res) console.log(`${x.ok ? "OK  " : "FALLA"} ${x.id} ${x.nombre}${x.det ? " — " + x.det : ""}`);
  console.log(`\n${res.filter((x) => x.ok).length}/${res.length} casos OK`);
  await br.close();
})();
