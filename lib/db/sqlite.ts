import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { seedSiVacio } from "./seed";

const RUTA = process.env.SQLITE_PATH ?? path.join(process.cwd(), "data", "ponte.db");

// Conexión única por proceso (también sobrevive al hot-reload de Next en desarrollo).
const g = globalThis as unknown as { __db?: Database.Database };

export function getDb(): Database.Database {
  if (g.__db) return g.__db;
  fs.mkdirSync(path.dirname(RUTA), { recursive: true });
  const db = new Database(RUTA);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(fs.readFileSync(path.join(process.cwd(), "lib", "db", "schema.sql"), "utf8"));
  migrar(db);
  seedSiVacio(db);
  g.__db = db;
  return db;
}

/** Columnas agregadas después de la primera versión (para bases ya creadas). */
function migrar(db: Database.Database) {
  const cols = (db.prepare("PRAGMA table_info(clientes)").all() as { name: string }[]).map((c) => c.name);
  if (!cols.includes("sin_beneficios")) db.exec("ALTER TABLE clientes ADD COLUMN sin_beneficios INTEGER NOT NULL DEFAULT 0");
  const colsIng = (db.prepare("PRAGMA table_info(fin_ingresos)").all() as { name: string }[]).map((c) => c.name);
  if (!colsIng.includes("fecha")) db.exec("ALTER TABLE fin_ingresos ADD COLUMN fecha TEXT NOT NULL DEFAULT ''");
  // Bases creadas con la fecha fija (claves fecha_sistema o fecha_demo): la última fecha usada pasa a ser la última
  // procesada, así el sistema cobra la mora y el CHICOTAZO de los días transcurridos desde entonces.
  for (const clave of ["fecha_sistema", "fecha_demo"]) {
    const vieja = db.prepare("SELECT valor FROM app_estado WHERE clave=?").get(clave) as { valor: string } | undefined;
    if (!vieja) continue;
    db.prepare("INSERT OR IGNORE INTO app_estado (clave,valor) VALUES ('fecha_procesada',?)").run(vieja.valor);
    db.prepare("DELETE FROM app_estado WHERE clave=?").run(clave);
  }
}

/** Borra todo y vuelve a sembrar (reinicio de la aplicación a su estado inicial). */
export function resetDb(): Database.Database {
  const db = getDb();
  db.exec("PRAGMA foreign_keys = OFF");
  for (const t of ["fin_gastos", "fin_ingresos", "fin_categorias", "campanas", "eventos", "trivia_respuestas", "trivia_preguntas", "movimientos_score", "propuestas", "cuotas_vencidas", "creditos", "clientes", "app_estado"]) {
    db.exec(`DELETE FROM ${t}`);
  }
  db.exec("DELETE FROM sqlite_sequence");
  db.exec("PRAGMA foreign_keys = ON");
  seedSiVacio(db);
  return db;
}
