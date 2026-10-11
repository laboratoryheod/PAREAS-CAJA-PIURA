import { describe, expect, it } from "vitest";
import { crearSesion, DURACION_SESION_S, verificarSesion } from "@/lib/sesion";

describe("sesión firmada del gestor", () => {
  it("un token recién creado es válido", async () => {
    expect(await verificarSesion(await crearSesion("gestor"))).toBe("gestor");
  });
  it("rechaza tokens alterados, inventados o el valor fijo antiguo", async () => {
    const t = await crearSesion("gestor");
    const [u, v, f] = t.split(".");
    expect(await verificarSesion(`admin.${v}.${f}`)).toBeNull();
    expect(await verificarSesion(`${u}.${Number(v) + 99999}.${f}`)).toBeNull();
    expect(await verificarSesion(`${u}.${v}.${f.slice(0, -2)}xx`)).toBeNull();
    expect(await verificarSesion("gestor-activo")).toBeNull();
    expect(await verificarSesion(undefined)).toBeNull();
  });
  it("vence a las 8 horas", async () => {
    const t = await crearSesion("gestor", Date.now());
    expect(await verificarSesion(t, Date.now() + (DURACION_SESION_S - 60) * 1000)).toBe("gestor");
    expect(await verificarSesion(t, Date.now() + (DURACION_SESION_S + 60) * 1000)).toBeNull();
  });
});
