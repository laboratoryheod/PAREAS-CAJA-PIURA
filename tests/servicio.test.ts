import { beforeAll, beforeEach, describe, expect, it } from "vitest";

let S: typeof import("@/lib/servicio");
const GENGIS = 1;

beforeAll(async () => {
  process.env.SQLITE_PATH = ":memory:";
  S = await import("@/lib/servicio");
});
beforeEach(() => S.reiniciarApp());

const plan = (nCuotas: number, inicial = 0, fecha = "2026-10-17") => ({ clienteId: GENGIS, nCuotas, inicial, fechaPrimerPago: fecha });

describe("Gengis Guerrero (cliente de ejemplo)", () => {
  it("parte en mora con S/ 320 y 12 días, score 70", () => {
    const s = S.situacion(GENGIS);
    expect(s.estado).toBe("en_mora");
    expect(s.diasAtraso).toBe(12);
    expect(s.deuda.montoVencido).toBe(320);
    expect(s.deuda.total).toBeCloseTo(326.08, 2);
    expect(s.score).toBe(70);
    expect(s.pareas.humor).toBe("chicotazo");
    expect(s.saludo).toContain("Hola, Gengis.");
    expect(s.saludo).not.toMatch(/compare|¡Habla|\btienes\b/);
  });

  it("el simulador valida en servidor y propone la alternativa más cercana", () => {
    const ok = S.simular(plan(2));
    expect(ok.validacion.aceptable).toBe(true);
    expect(ok.validacion.semaforo).toBe("verde");
    expect(ok.total).toBeCloseTo(326.08, 2);
    const mal = S.simular(plan(3)); // 12 días: máx 2 cuotas
    expect(mal.validacion.aceptable).toBe(false);
    expect(mal.validacion.contrapropuesta?.nCuotas).toBe(2);
  });

  it("no acepta una propuesta que incumple reglas, ni sin motivo ni sin aceptación", async () => {
    await expect(S.registrarPropuesta({ ...plan(3), motivo: "olvido", acepta: true })).rejects.toThrow();
    await expect(S.registrarPropuesta({ ...plan(2), acepta: true })).rejects.toThrow(/qué ocurrió/);
    await expect(S.registrarPropuesta({ ...plan(2), motivo: "olvido" })).rejects.toThrow(/aceptar/);
  });

  it("aceptar el plan NO detiene el chicotazo: recién el primer pago lo hace", async () => {
    const r = await S.registrarPropuesta({ ...plan(2), motivo: "bajaron_ventas", acepta: true });
    expect(r.estado).toBe("aceptada");
    expect(r.situacion.estado).toBe("plan_pendiente");
    expect(r.situacion.diasAtraso).toBe(12);
    expect(r.situacion.pareas.humor).toBe("chicotazo");
    S.avanzarDia();
    expect(S.situacion(GENGIS).score).toBe(70 - 12); // sigue pegando
    const pago = await S.registrarPago(GENGIS);
    expect(pago.situacion.estado).toBe("reprogramado");
    expect(pago.situacion.diasAtraso).toBe(0);
    expect(pago.mensajes.join(" ")).toMatch(/Su plan está activo/);
    S.avanzarDia();
    expect(S.situacion(GENGIS).score).toBe(70 - 12 + 15); // ya no pega
  });

  it("propuesta aceptada aparece en el banco y solo hay una activa", async () => {
    await S.registrarPropuesta({ ...plan(2), motivo: "bajaron_ventas", acepta: true });
    expect(S.feed(0, 50).items.some((i) => i.tipo === "propuesta_enviada" && i.texto.includes("Gengis G."))).toBe(true);
    // una sola reprogramación activa
    await expect(S.registrarPropuesta({ ...plan(2), motivo: "olvido", acepta: true })).rejects.toThrow();
    expect(S.kpis().propuestasAceptadas).toBe(13);
  });

  it("cumplir el plan: pagos a tiempo suman y al final se cumple la promesa (+20)", async () => {
    await S.registrarPropuesta({ ...plan(2), motivo: "olvido", acepta: true });
    const primero = await S.registrarPago(GENGIS);
    expect(primero.situacion.score).toBe(85); // 70 + 15 por pagar a tiempo
    const fin = (await S.registrarPago(GENGIS)).situacion;
    expect(fin.estado).toBe("al_dia");
    expect(fin.score).toBe(100); // 85 + 15 + 20 de promesa cumplida, acotado a 100
  });

  it("incumplir el plan: solo chicotazo diario, sin -25, y pierde beneficios", async () => {
    await S.registrarPropuesta({ ...plan(2, 0, "2026-10-12"), motivo: "olvido", acepta: true });
    for (let i = 0; i < 3; i++) S.avanzarDia(); // 11, 12 y 13 oct: pasa la fecha del primer pago
    const s = S.situacion(GENGIS);
    expect(s.estado).toBe("incumplido");
    expect(s.sinBeneficios).toBe(true);
    expect(s.score).toBe(70 - 3 * 12);
    expect(s.limites).toBeNull();
    expect(S.detalleCliente(GENGIS).historialScore.some((m) => m.tipo === "promesa_incumplida")).toBe(false);
    expect(S.simular(plan(2, 0, "2026-10-20")).validacion.resultado).toBe("no_disponible");
    await expect(S.registrarPropuesta({ ...plan(2, 0, "2026-10-20"), motivo: "olvido", acepta: true })).rejects.toThrow(/no puede armar otro plan/);
    expect(S.feed(0, 80).items.some((i) => i.tipo === "promesa_incumplida" && i.texto.includes("Gengis G."))).toBe(true);
  });

  it("pagar la deuda hoy: queda al día y Pareas feliz", async () => {
    const cobro = await S.cobroPendiente(GENGIS);
    expect(cobro.concepto).toBe("deuda");
    expect(cobro.qr).toMatch(/^data:image\/png/);
    const r = await S.registrarPago(GENGIS, "deuda");
    expect(r.situacion.estado).toBe("al_dia");
    expect(r.situacion.pareas.humor).toBe("feliz");
    await expect(S.registrarPago(GENGIS)).rejects.toThrow(/al día/);
  });
});

describe("modo rescate", () => {
  async function incumplir() {
    await S.registrarPropuesta({ ...plan(2, 0, "2026-10-11"), motivo: "olvido", acepta: true });
    S.avanzarDia(); S.avanzarDia();
  }
  it("el gestor lo otorga: paga 30% menos hoy, recupera beneficios y queda al día", async () => {
    await incumplir();
    const deuda = S.situacion(GENGIS).deuda.total;
    const { regalo } = S.otorgarRegalo(GENGIS);
    expect(regalo.montoHoy).toBeCloseTo(deuda * 0.7, 1);
    expect(regalo.recargos).toHaveLength(3);
    const s = S.situacion(GENGIS);
    expect(s.regalo?.montoHoy).toBe(regalo.montoHoy);
    expect(s.pareas.mensaje).toMatch(/Modo Rescate/);
    const cobro = await S.cobroPendiente(GENGIS);
    expect(cobro.concepto).toBe("regalo");
    expect(cobro.monto).toBe(regalo.montoHoy);
    const r = await S.registrarPago(GENGIS, "regalo");
    expect(r.situacion.estado).toBe("al_dia");
    expect(r.situacion.sinBeneficios).toBe(false);
    expect(r.situacion.regalo).toBeNull();
    expect(S.detalleCliente(GENGIS).campanas[0].estado).toBe("usada");
    expect(S.kpis().regalosUsados).toBe(1);
  });
  it("no se da dos veces ni a quien está al día", async () => {
    S.otorgarRegalo(GENGIS);
    expect(() => S.otorgarRegalo(GENGIS)).toThrow(/vigente/);
    await S.registrarPago(GENGIS);
    expect(() => S.otorgarRegalo(GENGIS)).toThrow(/no está en mora/);
  });
  it("vence a los 7 días si no se usa", () => {
    S.otorgarRegalo(GENGIS);
    for (let i = 0; i < 8; i++) S.avanzarDia();
    expect(S.situacion(GENGIS).regalo).toBeNull();
    expect(S.detalleCliente(GENGIS).campanas[0].estado).toBe("vencida");
  });
});

describe("chicotazo y trivia en servidor", () => {
  it("en mora, aunque acierte toda la trivia, el score termina bajando", async () => {
    const antes = S.situacion(GENGIS).score;
    for (let i = 0; i < 5; i++) {
      const t = S.triviaSiguiente(GENGIS);
      const p = t.pregunta!;
      // el cliente no recibe la respuesta correcta
      expect(JSON.stringify(t)).not.toContain("correcta");
      // probamos todas las opciones hasta acertar usando la API interna
      const repo = (await import("@/lib/db/repo")).getRepo();
      const correcta = repo.preguntas().find((x) => x.id === p.id)!.correcta;
      S.responderTrivia(GENGIS, p.id, correcta);
    }
    expect(S.triviaSiguiente(GENGIS).progreso.completo).toBe(true);
    const tras = S.situacion(GENGIS).score;
    expect(tras).toBe(antes + 10); // tope +10, la racha no suma en mora
    S.avanzarDia();
    expect(S.situacion(GENGIS).score).toBe(tras - 12);
    expect(S.situacion(GENGIS).diasAtraso).toBe(13);
  });

  it("solo la trivia usa tono coloquial", async () => {
    const p = S.triviaSiguiente(GENGIS).pregunta!;
    const r = S.responderTrivia(GENGIS, p.id, 99); // opción inexistente: falla a propósito
    expect(r.mensaje).toMatch(/compare/);
    expect(S.situacion(GENGIS).pareas.mensaje).not.toMatch(/compare/);
  });

  it("no se puede responder dos veces la misma pregunta", async () => {
    const p = S.triviaSiguiente(GENGIS).pregunta!;
    S.responderTrivia(GENGIS, p.id, 0);
    expect(() => S.responderTrivia(GENGIS, p.id, 0)).toThrow(/Ya respondiste/);
  });
});

describe("notificaciones del cliente", () => {
  const tipos = () => S.notificacionesCliente(GENGIS).map((n) => n.tipo);
  it("en mora avisa del CHICOTAZO y de la trivia pendiente, en tono coloquial", () => {
    const ns = S.notificacionesCliente(GENGIS);
    expect(ns.map((n) => n.tipo)).toEqual(["mora", "trivia"]);
    expect(ns[0].mensaje).toMatch(/CHICOTAZO/);
    expect(ns.every((n) => /compare/.test(n.mensaje))).toBe(true);
  });
  it("avisa cuando un pago del plan vence en 3 días o menos (y no antes)", async () => {
    await S.registrarPropuesta({ ...plan(2, 0, "2026-10-12"), motivo: "olvido", acepta: true });
    const n = S.notificacionesCliente(GENGIS).find((x) => x.tipo === "pago_cerca")!;
    expect(n.titulo).toMatch(/en 2 días/);
    expect(n.mensaje).toMatch(/sino te caerá el CHICOTAZO/);
    S.reiniciarApp();
    await S.registrarPropuesta({ ...plan(2, 0, "2026-10-20"), motivo: "olvido", acepta: true });
    expect(tipos()).not.toContain("pago_cerca");
  });
  it("el Modo Rescate va primero", () => {
    S.otorgarRegalo(GENGIS);
    const ns = S.notificacionesCliente(GENGIS);
    expect(ns[0].tipo).toBe("rescate");
    expect(ns.map((n) => n.tipo)).not.toContain("mora");
  });
  it("sin trivia pendiente no avisa de la trivia", async () => {
    const repo = (await import("@/lib/db/repo")).getRepo();
    for (let i = 0; i < 5; i++) { const p = S.triviaSiguiente(GENGIS).pregunta!; S.responderTrivia(GENGIS, p.id, repo.preguntas().find((x) => x.id === p.id)!.correcta); }
    expect(tipos()).not.toContain("trivia");
  });
});

describe("banco", () => {
  it("cartera de 100 con filtros y cola de derivados", () => {
    expect(S.cartera().length).toBe(100);
    const t = S.cartera({ tramo: ">60" });
    expect(t.length).toBeGreaterThan(0);
    expect(t.every((c) => c.diasAtraso > 60)).toBe(true);
    expect(S.cartera({ q: "gengis" }).length).toBe(1);
    expect(S.derivados().every((d) => d.motivos.length > 0)).toBe(true);
  });
  it("el resumen consolidado coincide con kpis() y derivados() por separado", () => {
    const r = S.resumenBanco();
    expect(r.kpis).toEqual(S.kpis());
    expect(r.derivados).toEqual(S.derivados());
    expect(S.cartera().filter((c) => c.pideAyuda).length).toBe(2);
  });
  it("kpis coherentes", () => {
    const k = S.kpis();
    expect(k.avisosEnviados).toBe(100);
    expect(k.propuestasAceptadas).toBe(12); // 10 aceptadas + 2 incumplidas sembradas
    expect(k.incumplidos).toBe(2);
    expect(k.montoComprometido).toBeGreaterThan(0);
  });
});
