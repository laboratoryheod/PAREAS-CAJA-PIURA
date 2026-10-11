import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CATEGORIAS_BASE, gastoEnMes, ingresoMensual, resumenMensual, semaforoDe, validarMonto, validarNombre, type CuotaCredito, type Gasto, type Ingreso } from "@/lib/finanzas";
import { consejosFinanzas } from "@/lib/consejos-finanzas";

const HOY = "2026-10-10";
const sinCredito: CuotaCredito = { proxima: null, vencido: 0, conRescate: false };
const cuota = (monto: number, vencido = 0): CuotaCredito => ({ proxima: { monto, fecha: "2026-10-28", diasFaltan: 18, concepto: "cuota" }, vencido, conRescate: false });
const ing = (monto: number, frecuencia: Ingreso["frecuencia"] = "mensual", id = 1): Ingreso => ({ id, nombre: "Ventas", monto, frecuencia });
const gas = (monto: number, categoria = "alimentacion", extra: Partial<Gasto> = {}): Gasto => ({ id: Math.random(), nombre: "Gasto", monto, categoria, fecha: HOY, tipo: "variable", ambito: "personal", ...extra });

describe("cálculos de Mis Finanzas", () => {
  it("lleva los ingresos a su equivalente mensual", () => {
    expect(ingresoMensual(ing(100, "semanal"))).toBeCloseTo(433.33, 2);
    expect(ingresoMensual(ing(500, "quincenal"))).toBe(1000);
    expect(ingresoMensual(ing(800, "unico"))).toBe(800);
  });
  it("los gastos fijos se repiten cada mes; los variables solo cuentan en su mes", () => {
    expect(gastoEnMes({ fecha: "2026-09-05", tipo: "fijo" }, "2026-10")).toBe(true);
    expect(gastoEnMes({ fecha: "2026-09-05", tipo: "variable" }, "2026-10")).toBe(false);
    expect(gastoEnMes({ fecha: "2026-11-01", tipo: "fijo" }, "2026-10")).toBe(false);
  });
  it("ingresos − gastos − cuota − vencido = lo que sobra", () => {
    const r = resumenMensual({ ingresos: [ing(2000)], gastos: [gas(500), gas(300, "salud")], credito: cuota(320, 100), hoy: HOY });
    expect(r).toMatchObject({ ingresos: 2000, gastos: 800, cuota: 320, vencido: 100, sobra: 780, pctSobra: 39, semaforo: "verde", noAlcanza: false });
    expect(r.porCategoria[0]).toMatchObject({ categoria: "alimentacion", total: 500, pctIngreso: 25 });
  });
  it("semáforo: verde > 20 %, amarillo 5–20 %, rojo < 5 % o negativo", () => {
    expect(semaforoDe(1000, 201)).toBe("verde");
    expect(semaforoDe(1000, 200)).toBe("amarillo");
    expect(semaforoDe(1000, 50)).toBe("amarillo");
    expect(semaforoDe(1000, 49)).toBe("rojo");
    expect(semaforoDe(1000, -10)).toBe("rojo");
    expect(semaforoDe(0, 0)).toBe("sin_datos");
  });
  it("separa gastos personales y del negocio", () => {
    const r = resumenMensual({ ingresos: [ing(1000)], gastos: [gas(100), gas(250, "negocio", { ambito: "negocio" })], credito: sinCredito, hoy: HOY });
    expect(r.porAmbito).toEqual({ personal: 100, negocio: 250 });
  });
  it("valida montos y nombres con mensajes claros", () => {
    expect(validarMonto("150,5")).toBe(150.5);
    expect(() => validarMonto(0)).toThrow(/mayor a cero/);
    expect(() => validarMonto("12.345")).toThrow(/2 decimales/);
    expect(() => validarMonto("abc")).toThrow(/monto/);
    expect(() => validarNombre("  ")).toThrow(/nombre/);
  });
});

describe("motor de consejos", () => {
  it("da como máximo 3 consejos y avisa si el dinero no alcanza para la cuota", () => {
    const r = resumenMensual({ ingresos: [ing(1000)], gastos: [gas(700), gas(250, "salud")], credito: cuota(320, 200), hoy: HOY });
    const c = consejosFinanzas(r, CATEGORIAS_BASE);
    expect(c.length).toBeLessThanOrEqual(3);
    expect(c.map((x) => x.id)).toEqual(["vencido", "no_alcanza", "gasto_alto"]);
    expect(c[1].accion?.tipo).toBe("asesor");
  });
  it("señala la categoría más alta y lo que sobra", () => {
    const r = resumenMensual({ ingresos: [ing(2000)], gastos: [gas(900)], credito: cuota(200), hoy: HOY });
    const c = consejosFinanzas(r, CATEGORIAS_BASE);
    expect(c.find((x) => x.id === "categoria_alta")?.texto).toMatch(/Alimentación/);
    expect(c.find((x) => x.id === "sobra")?.texto).toMatch(/S\/ 900\.00/);
  });
  it("sin ingresos pide registrarlos", () => {
    const c = consejosFinanzas(resumenMensual({ ingresos: [], gastos: [], credito: sinCredito, hoy: HOY }), CATEGORIAS_BASE);
    expect(c[0].accion?.tipo).toBe("agregar_ingreso");
  });
});

describe("Mis Finanzas en el servidor", () => {
  let S: typeof import("@/lib/servicio");
  beforeAll(async () => { process.env.SQLITE_PATH = ":memory:"; S = await import("@/lib/servicio"); });
  beforeEach(() => S.reiniciarApp());

  it("Gengis trae datos de ejemplo y descuenta su cuota y su deuda vencida", () => {
    const f = S.finanzasCliente(1);
    expect(f.ingresos.length).toBeGreaterThan(0);
    expect(f.gastos.length).toBeGreaterThan(0);
    expect(f.credito.proxima?.monto).toBe(320);
    expect(f.credito.proxima!.fecha > f.hoy).toBe(true);
    expect(f.credito.vencido).toBeCloseTo(326.08, 2);
    expect(f.resumen.sobra).toBeCloseTo(f.resumen.ingresos - f.resumen.gastos - 320 - 326.08, 2);
    expect(f.consejos.length).toBeLessThanOrEqual(3);
  });
  it("agrega, edita y borra gastos; valida en el servidor", () => {
    const antes = S.finanzasCliente(1).resumen.gastos;
    let f = S.accionFinanzas(1, "guardar_gasto", { nombre: "Gas", monto: "45.50", categoria: "vivienda", tipo: "variable", ambito: "personal" });
    expect(f.resumen.gastos).toBeCloseTo(antes + 45.5, 2);
    const id = f.gastos.find((g) => g.nombre === "Gas")!.id;
    f = S.accionFinanzas(1, "guardar_gasto", { id, nombre: "Gas", monto: 50, categoria: "vivienda", tipo: "variable", ambito: "personal" });
    expect(f.resumen.gastos).toBeCloseTo(antes + 50, 2);
    f = S.accionFinanzas(1, "borrar_gasto", { id });
    expect(f.resumen.gastos).toBeCloseTo(antes, 2);
    expect(() => S.accionFinanzas(1, "guardar_gasto", { nombre: "X", monto: -1, categoria: "vivienda", tipo: "variable", ambito: "personal" })).toThrow(/mayor a cero/);
    expect(() => S.accionFinanzas(1, "guardar_gasto", { nombre: "X", monto: 1, categoria: "nada", tipo: "variable", ambito: "personal" })).toThrow(/categoría/);
  });
  it("crea etiquetas propias y las usa en un gasto", () => {
    let f = S.accionFinanzas(1, "crear_categoria", { nombre: "Fiesta patronal", color: "#D6247A", icono: "estrella" });
    const cat = f.categorias.find((c) => c.nombre === "Fiesta patronal")!;
    expect(cat.propia).toBe(true);
    f = S.accionFinanzas(1, "guardar_gasto", { nombre: "Cuota de la fiesta", monto: 30, categoria: cat.id, tipo: "variable", ambito: "personal" });
    expect(f.resumen.porCategoria.some((c) => c.categoria === cat.id)).toBe(true);
    expect(() => S.accionFinanzas(1, "crear_categoria", { nombre: "fiesta patronal" })).toThrow(/Ya tiene/);
  });
  it("un cliente no puede tocar los gastos de otro", () => {
    const id = S.finanzasCliente(1).gastos[0].id;
    expect(() => S.accionFinanzas(2, "borrar_gasto", { id })).toThrow(/No encontramos/);
  });
});
