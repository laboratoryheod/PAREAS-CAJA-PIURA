import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

let A: typeof import("@/lib/asistente");
const llamadas: { url: string; body: any; auth: string }[] = [];
beforeAll(async () => {
  process.env.SQLITE_PATH = ":memory:";
  process.env.OPENAI_API_KEY = "sk-prueba";
  process.env.OPENAI_MODEL = "gpt-4o-mini";
  process.env.IA_MAX_CLIENTE_DIA = "3";
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: { body: string; headers: Record<string, string> }) => {
    llamadas.push({ url, body: JSON.parse(init.body), auth: init.headers.authorization });
    if (llamadas.length === 3) return new Response(JSON.stringify({ error: { code: "invalid_api_key" } }), { status: 401 });
    return new Response(JSON.stringify({ choices: [{ message: { content: "Puede pagar con QR. Uno. Dos. Tres." } }] }), { status: 200 });
  }));
  A = await import("@/lib/asistente");
});
afterAll(() => { vi.unstubAllGlobals(); delete process.env.OPENAI_API_KEY; });

describe("asistente con OpenAI", () => {
  it("el FAQ y los filtros siguen sin gastar tokens", async () => {
    await A.conversar(1, "¿Cuánto debo?");
    await A.conversar(1, "escríbeme un poema");
    await A.conversar(1, "mi clave es 1234");
    expect(llamadas).toHaveLength(0);
  });
  it("una pregunta en tema sin plantilla va a OpenAI con las reglas y los HECHOS del servidor", async () => {
    const r = await A.conversar(1, "¿mi historial en la caja mejora si cumplo?");
    expect(r.fuente).toBe("openai");
    expect(r.respuesta).toBe("Puede pagar con QR. Uno. Dos."); // máximo 3 oraciones
    const { url, body, auth } = llamadas[0];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect(auth).toBe("Bearer sk-prueba");
    expect(body.model).toBe("gpt-4o-mini");
    expect(body.max_tokens).toBeLessThanOrEqual(150);
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[0].content).toContain("S/ 326.08"); // deuda calculada por el servidor
    expect(body.messages[0].content).toContain("Próxima cuota del crédito");
    expect(body.messages[0].content).toContain("PAREAS");
  });
  it("si OpenAI falla, responde con el FAQ (nunca deja al cliente sin respuesta)", async () => {
    await A.conversar(1, "¿mi historial en la caja mejora si cumplo?"); // 2.ª llamada OK
    const r = await A.conversar(1, "¿mi historial en la caja mejora si cumplo?"); // 3.ª: 401
    expect(r.fuente).toBe("faq");
    expect(r.respuesta.length).toBeGreaterThan(10);
  });
  it("respeta el cupo diario por cliente (los intentos fallidos no gastan cupo)", async () => {
    expect((await A.conversar(1, "¿mi historial en la caja mejora si cumplo?")).fuente).toBe("openai"); // 3.ª respuesta: llega al cupo de 3
    const r = await A.conversar(1, "¿mi historial en la caja mejora si cumplo?");
    expect(r.respuesta).toMatch(/realizó muchas consultas/);
    expect(llamadas).toHaveLength(4);
  });
});
