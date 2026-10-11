import { describe, it, expect } from "vitest";
import { validarPropuesta, limitesPara, interesMoratorio, calcularRegaloSalvador, type CreditoReglas } from "@/lib/reglas";

const HOY = "2026-10-10";
const credito = (diasAtraso: number, montoVencido = 1000, interes = 0, activa = false): CreditoReglas =>
  ({ diasAtraso, montoVencido, interesMoratorio: interes, reprogramacionActiva: activa });
const plan = (nCuotas: number, inicial = 0, fechaPrimerPago = HOY) => ({ nCuotas, inicial, fechaPrimerPago });
const SCORE = 65; // Plata, ≥ 60

describe("tramo 1–15 días: 2 cuotas, 0% inicial", () => {
  it("acepta 2 cuotas sin inicial (día 1 y día 15)", () => {
    for (const d of [1, 15]) {
      const v = validarPropuesta(credito(d), { score: SCORE }, plan(2), HOY);
      expect(v.aceptable).toBe(true);
      expect(v.resultado).toBe("automatica");
    }
  });
  it("rechaza 3 cuotas y propone 2", () => {
    const v = validarPropuesta(credito(10), { score: SCORE }, plan(3), HOY);
    expect(v.aceptable).toBe(false);
    expect(v.contrapropuesta?.nCuotas).toBe(2);
    expect(validarPropuesta(credito(10), { score: SCORE }, v.contrapropuesta!, HOY).aceptable).toBe(true);
  });
});

describe("borde 15/16 días", () => {
  it("15 días: máx 2; 16 días: máx 3", () => {
    expect(limitesPara(credito(15), { score: SCORE }, HOY).maxCuotas).toBe(2);
    expect(limitesPara(credito(16), { score: SCORE }, HOY).maxCuotas).toBe(3);
    expect(validarPropuesta(credito(15), { score: SCORE }, plan(3), HOY).aceptable).toBe(false);
    expect(validarPropuesta(credito(16), { score: SCORE }, plan(3), HOY).aceptable).toBe(true);
  });
});

describe("tramo 16–30 días: score 59 vs 60", () => {
  it("score 60: 0% de inicial", () => {
    const l = limitesPara(credito(20), { score: 60 }, HOY);
    expect(l.inicialMinPct).toBe(0);
    expect(validarPropuesta(credito(20), { score: 60 }, plan(3, 0), HOY).aceptable).toBe(true);
  });
  it("score 59: 10% de inicial", () => {
    const l = limitesPara(credito(20), { score: 59 }, HOY);
    expect(l.inicialMinPct).toBe(0.1);
    expect(l.inicialMin).toBe(100);
    const v = validarPropuesta(credito(20), { score: 59 }, plan(3, 0), HOY);
    expect(v.aceptable).toBe(false);
    expect(v.contrapropuesta?.inicial).toBe(100);
    expect(validarPropuesta(credito(20), { score: 59 }, plan(3, 100), HOY).aceptable).toBe(true);
  });
});

describe("borde 30/31 días", () => {
  it("30 días: 3 cuotas, sin inicial (score alto); 31 días: 4 cuotas y 20%", () => {
    expect(limitesPara(credito(30), { score: SCORE }, HOY)).toMatchObject({ maxCuotas: 3, inicialMinPct: 0 });
    expect(limitesPara(credito(31), { score: SCORE }, HOY)).toMatchObject({ maxCuotas: 4, inicialMinPct: 0.2, inicialMin: 200 });
  });
  it("31 días sin inicial → contrapropuesta con 20%", () => {
    const v = validarPropuesta(credito(31), { score: SCORE }, plan(4, 0), HOY);
    expect(v.aceptable).toBe(false);
    expect(v.contrapropuesta).toMatchObject({ nCuotas: 4, inicial: 200 });
    expect(validarPropuesta(credito(31), { score: SCORE }, v.contrapropuesta!, HOY).aceptable).toBe(true);
  });
});

describe("borde 60/61 días", () => {
  it("60 días: aprobación automática con 20% y 4 cuotas", () => {
    const v = validarPropuesta(credito(60), { score: SCORE }, plan(4, 200), HOY);
    expect(v.aceptable).toBe(true);
    expect(v.resultado).toBe("automatica");
  });
  it("61 días: nunca automática; con 30% queda derivada a gestor", () => {
    const v = validarPropuesta(credito(61), { score: SCORE }, plan(4, 300), HOY);
    expect(v.aceptable).toBe(false);
    expect(v.resultado).toBe("derivada");
    expect(v.motivos).toEqual([]);
  });
  it("61 días con menos de 30% → contrapropuesta con 30%", () => {
    const v = validarPropuesta(credito(61), { score: SCORE }, plan(4, 100), HOY);
    expect(v.resultado).toBe("no_cumple");
    expect(v.contrapropuesta?.inicial).toBe(300);
  });
});

describe("otras reglas", () => {
  it("cuota mínima S/ 20: reduce el número de cuotas", () => {
    const v = validarPropuesta(credito(10, 50), { score: SCORE }, plan(2, 0), HOY); // 25 c/u: ok
    expect(v.aceptable).toBe(true);
    const w = validarPropuesta(credito(10, 30), { score: SCORE }, plan(2, 0), HOY); // 15 c/u
    expect(w.aceptable).toBe(false);
    expect(w.contrapropuesta?.nCuotas).toBe(1);
  });
  it("una sola reprogramación activa por crédito", () => {
    const v = validarPropuesta(credito(10, 1000, 0, true), { score: SCORE }, plan(2), HOY);
    expect(v.aceptable).toBe(false);
    expect(v.resultado).toBe("no_disponible");
  });
  it("incluye el interés moratorio en la deuda", () => {
    const v = validarPropuesta(credito(10, 300, 20), { score: SCORE }, plan(2), HOY);
    expect(v.limites.deuda).toBe(320);
    expect(v.cronograma.total).toBe(320);
  });
  it("cronograma: la última cuota absorbe el redondeo", () => {
    const v = validarPropuesta(credito(20, 100), { score: SCORE }, plan(3, 0), HOY);
    expect(v.cronograma.pagos.map((p) => p.monto)).toEqual([33.33, 33.33, 33.34]);
  });
  it("primer pago no puede ser pasado ni a más de 30 días", () => {
    expect(validarPropuesta(credito(10), { score: SCORE }, plan(2, 0, "2026-10-09"), HOY).aceptable).toBe(false);
    const v = validarPropuesta(credito(10), { score: SCORE }, plan(2, 0, "2026-12-01"), HOY);
    expect(v.aceptable).toBe(false);
    expect(v.contrapropuesta?.fechaPrimerPago).toBe("2026-11-09");
  });
  it("nivel Oro desbloquea una cuota extra y menos inicial", () => {
    const l = limitesPara(credito(31), { score: 80 }, HOY);
    expect(l.maxCuotas).toBe(5);
    expect(l.inicialMinPct).toBe(0.15);
  });
  it("interés moratorio simple por día", () => {
    expect(interesMoratorio(320, 12, 0.38)).toBe(6.08);
    expect(interesMoratorio(320, 0, 0.38)).toBe(0);
  });
});

describe("incumplimiento y modo rescate", () => {
  it("quien incumplió no puede reprogramar ni tiene beneficios de nivel", () => {
    const v = validarPropuesta(credito(10), { score: 80, sinBeneficios: true }, plan(2), HOY);
    expect(v.aceptable).toBe(false);
    expect(v.resultado).toBe("no_disponible");
    expect(v.contrapropuesta).toBeNull();
    expect(limitesPara(credito(31), { score: 80, sinBeneficios: true }, HOY)).toMatchObject({ maxCuotas: 4, inicialMinPct: 0.2 });
  });
  it("modo rescate: -30% hoy y +10% en 3 cuotas que recuperan exactamente el descuento", () => {
    const r = calcularRegaloSalvador(326.08, HOY);
    expect(r.descuento).toBe(97.82);
    expect(r.montoHoy).toBe(228.26);
    expect(r.recargos.map((x) => x.monto)).toEqual([32.61, 32.61, 32.6]);
    expect(r.recargos.reduce((s, x) => s + x.monto, 0)).toBeCloseTo(r.descuento, 2);
    expect(r.recargos.map((x) => x.fecha)).toEqual(["2026-11-10", "2026-12-10", "2027-01-10"]);
  });
});
