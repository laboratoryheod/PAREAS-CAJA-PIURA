// Descarga la cartera actual a data/cartera.xlsx (mismo formato que el botón "Descargar cartera en Excel").
import fs from "fs";
import path from "path";
import { excelCartera } from "../lib/excel-cartera";
import { filasExportacion } from "../lib/servicio";

async function main() {
  const filas = filasExportacion();
  const salida = path.join(process.cwd(), "data", process.argv[2] ?? "cartera.xlsx");
  fs.mkdirSync(path.dirname(salida), { recursive: true });
  fs.writeFileSync(salida, await excelCartera(filas));
  console.log(`Exportados ${filas.length} clientes a ${salida}`);
}
main();
