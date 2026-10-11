// Carga un Excel de cartera a la base (mismo proceso que el botón "Subir Excel" del panel del gestor).
// Uso: npm run importar:xlsx -- ruta/al/archivo.xlsx     ·     npm run plantilla:xlsx (crea data/plantilla-cartera.xlsx)
import fs from "fs";
import path from "path";
import { leerExcelCartera, plantillaCartera } from "../lib/excel-cartera";
import { importarCartera } from "../lib/servicio";

async function main() {
  const arg = process.argv[2];
  if (arg === "--plantilla") {
    const salida = path.join(process.cwd(), "data", "plantilla-cartera.xlsx");
    fs.mkdirSync(path.dirname(salida), { recursive: true });
    fs.writeFileSync(salida, await plantillaCartera());
    console.log(`Plantilla creada en ${salida}`);
    return;
  }
  if (!arg) { console.error("Indique el archivo: npm run importar:xlsx -- cartera.xlsx"); process.exit(1); }
  const buf = fs.readFileSync(path.resolve(arg));
  const filas = await leerExcelCartera(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
  const r = importarCartera(filas);
  console.log(`Filas: ${r.filas} · nuevos: ${r.creados} · actualizados: ${r.actualizados} · pagos registrados: ${r.pagados} · nueva mora: ${r.nuevaMora}`);
  for (const e of r.errores) console.log(`  Fila ${e.fila}: ${e.mensaje}`);
}
main().catch((e) => { console.error(e.message); process.exit(1); });
