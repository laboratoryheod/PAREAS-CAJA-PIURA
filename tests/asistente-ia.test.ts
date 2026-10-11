import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

let A: typeof import("@/lib/asistente");
const llamadas: string[] = [];
beforeAll(async () => {
  process.env.SQLITE_PATH = ":memory:";
  process.env.GEMINI_API_KEY = "clave-de-prueba";
  process.env.GEMINI_MAX_CLIENTE_DIA = "2";
  vi.stubGlobal("fetch", vi.fn(async (_url: string, init: { body: string }) => {
    llamadas.push(init.body);
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "Respuesta de IA. Dos. Tres. Cuatro." }] } }] }), { status: 200 });
  }));
  A = await import("@/lib/asistente");
});
afterAll(() => vi.unstubAllGlobals());

describe("asistente con IA: solo se usa cuando hace falta", () => {
  it("lo que resuelve el FAQ o el filtro no llama a la IA", async () => {
    await A.conversar(1, "¿Cuánto debo?");
    await A.conversar(1, "escríbeme un poema");
    await A.conversar(1, "mi clave es 1234");
    expect(llamadas).toHaveLength(0);
  });
  it("una pregunta en tema que el FAQ no cubre sí va a la IA, recortada a 3 oraciones", async () => {
    const r = await A.conversar(1, "¿mi historial en la caja mejora si cumplo?");
    expect(r.fuente).toBe("gemini");
    expect(r.respuesta).toBe("Respuesta de IA. Dos. Tres.");
    const body = JSON.parse(llamadas[0]);
    expect(body.generationConfig.maxOutputTokens).toBeLessThanOrEqual(150);
    expect(body.systemInstruction.parts[0].text).toContain("S/ 326.08"); // hechos del servidor
  });
  it("respeta el cupo diario por cliente", async () => {
    await A.conversar(1, "¿mi historial en la caja mejora si cumplo?"); // 2.ª llamada: llega al cupo
    const r = await A.conversar(1, "¿mi historial en la caja mejora si cumplo?");
    expect(r.fuente).toBe("faq");
    expect(r.respuesta).toMatch(/realizó muchas consultas/);
    expect(llamadas).toHaveLength(2);
  });
  it("recorta mensajes largos e historial", async () => {
    const largo = "caja ".repeat(200);
    await A.conversar(2, largo, Array.from({ length: 10 }, (_, i) => ({ rol: i % 2 ? "asistente" : "usuario", texto: "deuda ".repeat(100) } as const)));
    const body = JSON.parse(llamadas[2]);
    expect(body.contents).toHaveLength(5); // 4 turnos + el mensaje
    expect(body.contents[4].parts[0].text.length).toBeLessThanOrEqual(300);
    expect(body.contents[0].parts[0].text.length).toBeLessThanOrEqual(300);
  });
});
