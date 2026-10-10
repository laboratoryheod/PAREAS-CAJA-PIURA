import { beforeAll, describe, expect, it } from "vitest";

let A: typeof import("@/lib/asistente");
let S: typeof import("@/lib/servicio");
beforeAll(async () => {
  process.env.SQLITE_PATH = ":memory:";
  delete process.env.GEMINI_API_KEY; // fuerza el FAQ
  A = await import("@/lib/asistente");
  S = await import("@/lib/servicio");
});

describe("asistente (FAQ de respaldo)", () => {
  it("responde la deuda con cifras del servidor", async () => {
    const r = await A.conversar(1, "¿Cuánto debo?");
    expect(r.fuente).toBe("faq");
    expect(r.respuesta).toContain("S/ 326.08");
    expect(r.respuesta).toContain("12 días");
  });
  it("explica las opciones de plan según las reglas", async () => {
    const r = await A.conversar(1, "¿Qué opciones de reprogramación tengo?");
    expect(r.respuesta).toContain("hasta en 2 cuotas");
  });
  it("no promete condonaciones", async () => {
    const r = await A.conversar(1, "¿Me pueden perdonar los intereses? quiero una condonación");
    expect(r.respuesta).toMatch(/No puedo prometer/);
  });
  it("nunca acepta claves ni tarjetas", async () => {
    for (const m of ["mi clave es 1234", "mi tarjeta 4111 1111 1111 1111", "te paso mi token"]) {
      const r = await A.conversar(1, m);
      expect(r.fuente).toBe("filtro");
      expect(r.respuesta).toMatch(/nunca te pediremos/);
    }
  });
  it("deriva a gestor humano y lo registra para el banco", async () => {
    const r = await A.conversar(1, "quiero hablar con un gestor");
    expect(r.derivar).toBe(true);
    expect(S.derivados().some((d) => d.id === 1 && d.motivos.includes("Pidió ayuda humana"))).toBe(true);
  });
  it("limita a 3 oraciones las respuestas del modelo", async () => {
    const { limitarOraciones } = await import("@/lib/asistente/gemini");
    expect(limitarOraciones("Uno. Dos. Tres. Cuatro. Cinco.", 3)).toBe("Uno. Dos. Tres.");
  });
});
