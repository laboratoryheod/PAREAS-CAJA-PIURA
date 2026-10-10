import { describe, it, expect } from "vitest";
import { calcularScore, chicotazoDelDia, netoDiario, estadoPareas, PARAMS_SCORE, puntosParaSiguienteNivel, recalcularScore, type Movimiento } from "@/lib/score";

const mov = (tipo: Movimiento["tipo"], puntos: number, fecha = "2026-10-10"): Movimiento => ({ tipo, puntos, fecha });

describe("el chicotazo de Pareas", () => {
  it("el castigo diario supera el tope de trivia", () => {
    expect(Math.abs(PARAMS_SCORE.chicotazoPorDia)).toBeGreaterThan(PARAMS_SCORE.topeTriviaDia);
  });
  it("cliente en mora que acierta toda la trivia y completa la racha igual termina con neto diario negativo", () => {
    const neto = netoDiario({ diasAtraso: 12, aciertos: PARAMS_SCORE.preguntasPorDia, completoRacha: true });
    expect(neto).toBeLessThan(0);
  });
  it("lo mismo en la simulación día a día: baja aunque responda todo bien", () => {
    const movs: Movimiento[] = [];
    for (const dia of ["2026-10-10", "2026-10-11", "2026-10-12"]) {
      for (let i = 0; i < 5; i++) movs.push(mov("trivia", 2, dia));
      movs.push(mov("chicotazo_mora", chicotazoDelDia(12), dia));
    }
    expect(calcularScore(movs).score).toBe(70 - 3 * 2);
  });
  it("al pagar deja de bajar y sube", () => {
    expect(chicotazoDelDia(0)).toBe(0);
    const movs: Movimiento[] = [mov("chicotazo_mora", -12, "2026-10-10")]; // 58
    const antes = calcularScore(movs).score;
    for (let i = 0; i < 5; i++) movs.push(mov("trivia", 2, "2026-10-11"));
    movs.push(mov("racha", 5, "2026-10-11"));
    movs.push(mov("chicotazo_mora", chicotazoDelDia(0), "2026-10-11")); // 0: ya pagó
    const despues = calcularScore(movs).score;
    expect(despues).toBeGreaterThan(antes);
    expect(despues).toBe(58 + 10 + 5);
  });
  it("la racha no suma en mora pero sí al día", () => {
    expect(netoDiario({ diasAtraso: 1, aciertos: 0, completoRacha: true })).toBe(-12);
    expect(netoDiario({ diasAtraso: 0, aciertos: 5, completoRacha: true })).toBe(15);
  });
});

describe("topes y cotas", () => {
  it("trivia: tope +10 por día, se reinicia al día siguiente", () => {
    const movs = Array.from({ length: 8 }, () => mov("trivia", 2, "2026-10-10")).concat([mov("trivia", 2, "2026-10-11")]);
    expect(calcularScore(movs).score).toBe(70 + 10 + 2);
  });
  it("acota en [0, 100] paso a paso", () => {
    expect(calcularScore([mov("promesa_cumplida", 20), mov("promesa_cumplida", 20)]).score).toBe(100);
    expect(calcularScore([mov("promesa_incumplida", -25), mov("promesa_incumplida", -25), mov("promesa_incumplida", -25)]).score).toBe(0);
    // piso en 0 y luego sube desde 0 (no desde el negativo)
    expect(calcularScore([mov("promesa_incumplida", -80), mov("pago_puntual", 15)]).score).toBe(15);
  });
  it("niveles Bronce <50, Plata 50–74, Oro ≥75", () => {
    const n = (s: number) => calcularScore([mov("racha", s - 70)]).nivel;
    expect(n(49)).toBe("Bronce");
    expect(n(50)).toBe("Plata");
    expect(n(74)).toBe("Plata");
    expect(n(75)).toBe("Oro");
  });
  it("recalcularScore actualiza score y nivel en el almacén", () => {
    let guardado: unknown;
    const store = { movimientos: () => [mov("promesa_cumplida", 20)], actualizarScore: (id: number, s: number, n: string) => (guardado = [id, s, n]) };
    recalcularScore(store, 7);
    expect(guardado).toEqual([7, 90, "Oro"]);
  });
  it("puntos para el siguiente nivel", () => {
    expect(puntosParaSiguienteNivel(67)).toEqual({ siguiente: "Oro", faltan: 8 });
    expect(puntosParaSiguienteNivel(80)).toEqual({ siguiente: null, faltan: 0 });
  });
});

describe("estado de Pareas", () => {
  it("en mora: chicotazo con humor amable, sin amenazas", () => {
    const e = estadoPareas({ nombre: "Gengis", diasAtraso: 3, score: 60 });
    expect(e.humor).toBe("chicotazo");
    expect(e.mensaje).toMatch(/¡CHICOTAZO!/);
    expect(e.mensaje.toLowerCase()).not.toMatch(/legal|embargo|demanda|amenaz/);
  });
  it("al día: feliz; al día con score bajo: serio", () => {
    expect(estadoPareas({ diasAtraso: 0, score: 80 }).humor).toBe("feliz");
    expect(estadoPareas({ diasAtraso: 0, score: 40 }).humor).toBe("serio");
  });
});
