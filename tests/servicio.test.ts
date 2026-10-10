import { beforeAll, beforeEach, describe, expect, it } from "vitest";

let S: typeof import("@/lib/servicio");
const GENGIS = 1;

beforeAll(async () => {
  process.env.SQLITE_PATH = ":memory:";
  S = await import("@/lib/servicio");
});
beforeEach(() => S.resetearDemo());

const plan = (nCuotas: number, inicial = 0, fecha = "2026-10-17") => ({ clienteId: GENGIS, nCuotas, inicial, fechaPrimerPago: fecha });

describe("Gengis Guerrero (demo)", () => {
  it("parte en mora con S/ 320 y 12 días, score 70", () => {
    const s = S.situacion(GENGIS);
    expect(s.estado).toBe("en_mora");
    expect(s.diasAtraso).toBe(12);
    expect(s.deuda.montoVencido).toBe(320);
    expect(s.deuda.total).toBeCloseTo(326.08, 2);
    expect(s.score).toBe(70);
    expect(s.pacaso.humor).toBe("chicotazo");
    expect(s.saludo).toContain("Hola, Gengis");
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
    await expect(S.registrarPropuesta({ ...plan(2), acepta: true })).rejects.toThrow(/qué pasó/);
    await expect(S.registrarPropuesta({ ...plan(2), motivo: "olvido" })).rejects.toThrow(/aceptar/);
  });

  it("propuesta aceptada: el Pacaso deja de pegar y aparece en el banco", async () => {
    const r = await S.registrarPropuesta({ ...plan(2), motivo: "bajaron_ventas", acepta: true });
    expect(r.estado).toBe("aceptada");
    expect(r.situacion.estado).toBe("reprogramado");
    expect(r.situacion.diasAtraso).toBe(0);
    expect(S.feed(0, 50).items.some((i) => i.tipo === "propuesta_enviada" && i.texto.includes("Gengis G."))).toBe(true);
    // una sola reprogramación activa
    await expect(S.registrarPropuesta({ ...plan(2), motivo: "olvido", acepta: true })).rejects.toThrow();
    expect(S.kpis().propuestasAceptadas).toBeGreaterThanOrEqual(11);
  });

  it("cumplir el plan: pagos a tiempo suman y al final se cumple la promesa (+20)", async () => {
    await S.registrarPropuesta({ ...plan(2), motivo: "olvido", acepta: true });
    const primero = await S.pagoSimulado(GENGIS);
    expect(primero.situacion.score).toBe(85); // 70 + 15 por pagar a tiempo
    const fin = (await S.pagoSimulado(GENGIS)).situacion;
    expect(fin.estado).toBe("al_dia");
    expect(fin.score).toBe(100); // 85 + 15 + 20 de promesa cumplida, acotado a 100
  });

  it("incumplir el plan: -25 y vuelve la mora", async () => {
    await S.registrarPropuesta({ ...plan(2, 0, "2026-10-12"), motivo: "olvido", acepta: true });
    for (let i = 0; i < 3; i++) S.avanzarDia(); // pasa la fecha del primer pago (12 oct)
    const s = S.situacion(GENGIS);
    expect(s.estado).toBe("en_mora");
    expect(s.score).toBeLessThan(70 - 25 + 1);
    expect(S.detalleCliente(GENGIS).historialScore.some((m) => m.tipo === "promesa_incumplida")).toBe(true);
  });

  it("pagar la deuda hoy: queda al día y el Pacaso feliz", async () => {
    const cobro = await S.cobroPendiente(GENGIS);
    expect(cobro.concepto).toBe("deuda");
    expect(cobro.qr).toMatch(/^data:image\/png/);
    const r = await S.pagoSimulado(GENGIS, "deuda");
    expect(r.situacion.estado).toBe("al_dia");
    expect(r.situacion.pacaso.humor).toBe("feliz");
    await expect(S.pagoSimulado(GENGIS)).rejects.toThrow(/al día/);
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

  it("no se puede responder dos veces la misma pregunta", async () => {
    const p = S.triviaSiguiente(GENGIS).pregunta!;
    S.responderTrivia(GENGIS, p.id, 0);
    expect(() => S.responderTrivia(GENGIS, p.id, 0)).toThrow(/Ya respondiste/);
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
  it("kpis coherentes", () => {
    const k = S.kpis();
    expect(k.avisosEnviados).toBe(100);
    expect(k.propuestasAceptadas).toBe(10);
    expect(k.montoComprometido).toBeGreaterThan(0);
  });
});
