// Recorrido completo cliente + gestor (requiere Playwright). Ver scripts/qa/README.md.
const { chromium } = require("playwright");
const B = process.env.QA_URL ?? "http://localhost:3120";
const res = []; const caso = (id, n, ok, d = "") => { res.push({ id, n, ok: !!ok, d }); };
(async () => {
  const br = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  await fetch(B + "/api/pruebas/reset", { method: "POST" });
  const errs = [];
  const c = await (await br.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const g = await (await br.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
  for (const [p, k] of [[c, "cli"], [g, "ges"]]) { p.on("pageerror", (e) => errs.push(k + " " + e.message)); p.on("console", (m) => m.type() === "error" && errs.push(k + " " + m.text().slice(0, 140))); }
  // 1. Cliente entra, en mora
  await c.goto(B + "/cliente"); await c.waitForSelector("[role=dialog]"); await c.click("[role=dialog] >> text=Comenzar"); await c.waitForTimeout(500);
  caso("E2E-01", "Cliente ve su deuda de S/ 326.08", (await c.evaluate(() => document.body.innerText)).includes("326.08"));
  // 2. Trivia completa
  await c.click("text=Empezar"); await c.waitForSelector("text=A jugar, compare");
  let respondidas = 0;
  for (let i = 0; i < 5; i++) {
    const op = c.locator("button.min-h-\\[48px\\]").first();
    if (!(await op.count())) break;
    await op.click(); await c.waitForTimeout(700); respondidas++;
    const sig = c.locator("button:has-text('Siguiente')"); if (await sig.count()) { await sig.first().click(); await c.waitForTimeout(500); }
  }
  caso("E2E-02", "Responde las 5 preguntas de la trivia", respondidas === 5, `${respondidas} respondidas`);
  // 3. Gestor activa el Modo Rescate individual
  await g.goto(B + "/banco/login"); await g.fill("input >> nth=0", "gestor"); await g.fill("input[type=password]", "caja2026"); await g.keyboard.press("Enter");
  await g.waitForSelector("text=Situación de la cartera");
  await g.click("nav >> text=Modo Rescate"); await g.waitForSelector("text=Campaña individual");
  await g.fill("input[aria-label^='Buscar cliente']", "Gengis"); await g.waitForSelector("li:has-text('Gengis Guerrero') button:has-text('Activar Modo Rescate')");
  await g.click("li:has-text('Gengis Guerrero') button:has-text('Activar Modo Rescate')"); await g.waitForSelector("text=Modo Rescate activado a Gengis");
  caso("E2E-03", "Gestor activa el Modo Rescate a Gengis buscándolo por nombre", true);
  // 4. Cliente lo ve en vivo (polling) y paga
  await c.goto(B + "/cliente"); await c.waitForSelector("text=Usar mi Modo Rescate", { timeout: 15000 });
  caso("E2E-04", "El cliente ve la tarjeta del Modo Rescate", true);
  await c.click("text=Usar mi Modo Rescate >> nth=0"); await c.waitForSelector("text=Pago con Modo Rescate");
  const qr = await c.locator("img[alt*='QR'], img[src^='data:image']").count();
  caso("E2E-05", "Pantalla de pago con QR", qr > 0, `${qr} QR`);
  await c.click("text=Pagar ahora"); await c.waitForSelector("text=Pago hecho");
  caso("E2E-06", "Pago confirmado con comprobante", true);
  const s = await (await fetch(B + "/api/cliente/1")).json();
  caso("E2E-07", "Queda al día, sin deuda y con beneficios", s.estado === "al_dia" && s.deuda.total === 0 && !s.sinBeneficios, `${s.estado} ${s.deuda.total}`);
  // 5. Gestor ve el cambio
  await g.goto(B + "/banco/cliente/1"); await g.waitForSelector("text=Volver a la cartera");
  caso("E2E-08", "Gestor ve a Gengis \"Al día\" (texto legible, sin códigos)", (await g.evaluate(() => document.body.innerText)).includes("Al día") && !(await g.evaluate(() => document.body.innerText)).includes("al_dia"));
  // 6. Mis Finanzas tras pagar: sin deuda vencida
  await c.goto(B + "/cliente?ver=finanzas"); await c.waitForSelector("text=Lo que gano al mes");
  const txt = await c.evaluate(() => document.body.innerText);
  caso("E2E-09", "Mis Finanzas ya no descuenta deuda vencida tras pagar", !txt.includes("Deuda vencida (pagar ya)"));
  // 7. Asistente
  await c.goto(B + "/cliente?ver=asistente"); await c.waitForSelector("input[placeholder^=Escriba]");
  await c.fill("input[placeholder^=Escriba]", "¿Cuánto debo?"); await c.keyboard.press("Enter"); await c.waitForTimeout(1200);
  caso("E2E-10", "Asistente: está al día", (await c.evaluate(() => document.body.innerText)).includes("Está al día"));
  // 8. Excel: marcar pago de otro cliente
  caso("E2E-11", "Sin errores de consola en todo el recorrido", errs.length === 0, errs.slice(0, 3).join(" | "));
  for (const x of res) console.log(`${x.ok ? "OK  " : "FALLA"} ${x.id} ${x.n}${x.d ? " — " + x.d : ""}`);
  console.log(`\n${res.filter((x) => x.ok).length}/${res.length} casos OK`);
  await br.close();
})().catch((e) => { for (const x of res) console.log(`${x.ok ? "OK  " : "FALLA"} ${x.id} ${x.n}`); console.log("ERROR:", e.message.split("\n")[0]); });
