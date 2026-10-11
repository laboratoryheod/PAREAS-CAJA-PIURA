import ExcelJS from "exceljs";
import path from "path";
import { getDb } from "../lib/db/sqlite";

async function main() {
  const db = getDb();
  const filas = db.prepare(`
    SELECT c.id, c.nombres, c.dni_mascara AS dni, c.telefono, c.zona, c.negocio, c.score, c.nivel,
           cr.tipo_credito, cr.monto_desembolsado, cr.saldo_capital, cr.tea, cr.cuota_mensual, cr.cuotas_pendientes, cr.dias_atraso,
           (SELECT ROUND(SUM(monto),2) FROM cuotas_vencidas WHERE credito_id = cr.id) AS cuotas_vencidas,
           (SELECT ROUND(SUM(interes_moratorio),2) FROM cuotas_vencidas WHERE credito_id = cr.id) AS interes_moratorio
    FROM clientes c JOIN creditos cr ON cr.cliente_id = c.id ORDER BY c.id`).all() as Record<string, unknown>[];
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Deudores");
  ws.columns = Object.keys(filas[0]).map((k) => ({ header: k, key: k, width: 18 }));
  ws.addRows(filas);
  ws.getRow(1).font = { bold: true };
  const salida = path.join(process.cwd(), "data", "deudores.xlsx");
  await wb.xlsx.writeFile(salida);
  console.log(`Exportados ${filas.length} deudores a ${salida}`);
}
main();
