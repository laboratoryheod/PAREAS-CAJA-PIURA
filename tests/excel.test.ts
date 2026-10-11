import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import ExcelJS from "exceljs";

let S: typeof import("@/lib/servicio");
let X: typeof import("@/lib/excel-cartera");
beforeAll(async () => {
  process.env.SQLITE_PATH = ":memory:";
  S = await import("@/lib/servicio");
  X = await import("@/lib/excel-cartera");
});
beforeEach(() => S.reiniciarApp());

const aArrayBuffer = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

describe("cartera en Excel", () => {
  it("la plantilla se lee y agrega un cliente nuevo en mora", async () => {
    const filas = await X.leerExcelCartera(aArrayBuffer(await X.plantillaCartera()));
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({ dni: "45871236", nombres: "Rosa Atoche Navarro", cuotaMensual: 320, diasAtraso: 15, yaPago: false });
    const antes = S.cartera().length;
    const r = S.importarCartera(filas);
    expect(r).toMatchObject({ creados: 1, actualizados: 0, errores: [] });
    const nueva = S.cartera({ q: "45871236" });
    expect(S.cartera().length).toBe(antes + 1);
    expect(nueva[0]).toMatchObject({ nombres: "Rosa Atoche Navarro", diasAtraso: 15, estado: "en_mora", dni: "****1236" });
    // Subirla otra vez no duplica: actualiza por DNI
    expect(S.importarCartera(filas)).toMatchObject({ creados: 0, actualizados: 1 });
    expect(S.cartera().length).toBe(antes + 1);
  });

  it("descargar, marcar ¿Ya pagó? = Sí y volver a subir deja al cliente al día", async () => {
    const buf = await X.excelCartera(S.filasExportacion());
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(aArrayBuffer(buf));
    const ws = wb.getWorksheet("Cartera")!;
    const titulos = (ws.getRow(1).values as unknown[]).map(String);
    const colPago = titulos.indexOf("¿Ya pagó?");
    const colId = titulos.indexOf("ID sistema");
    ws.eachRow((row, n) => { if (n > 1 && Number(row.getCell(colId).value) === 1) row.getCell(colPago).value = "Sí"; });
    const editado = Buffer.from(await wb.xlsx.writeBuffer());

    expect(S.situacion(1).estado).toBe("en_mora");
    const r = S.importarCartera(await X.leerExcelCartera(aArrayBuffer(editado)));
    expect(r.creados).toBe(0);
    expect(r.pagados).toBe(1); // solo el marcado: volver a subir la cartera sin cambios no registra pagos
    expect(r.errores).toEqual([]);
    const s = S.situacion(1);
    expect(s.estado).toBe("al_dia");
    expect(s.deuda.total).toBe(0);
  });

  it("informa las filas con errores sin detener las demás", () => {
    const r = S.importarCartera([
      { fila: 2, nombres: "Sin DNI", tipoCredito: "Mype", cuotaMensual: 100 },
      { fila: 3, dni: "123", nombres: "DNI corto" },
      { fila: 4, dni: "70123456", nombres: "Luis Calle", tipoCredito: "Mype comercio", cuotaMensual: 200 },
    ]);
    expect(r.creados).toBe(1);
    expect(r.errores.map((e) => e.fila)).toEqual([2, 3]);
  });

  it("rechaza archivos que no son Excel", async () => {
    await expect(X.leerExcelCartera(new TextEncoder().encode("hola").buffer as ArrayBuffer)).rejects.toThrow(/Excel válido/);
  });
});
