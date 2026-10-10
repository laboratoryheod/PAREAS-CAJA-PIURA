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
  seedSiVacio(db);
  g.__db = db;
  return db;
}

/** Borra todo y vuelve a sembrar (para resetear la demo). */
export function resetDb(): Database.Database {
  const db = getDb();
  db.exec("PRAGMA foreign_keys = OFF");
  for (const t of ["eventos", "trivia_respuestas", "trivia_preguntas", "movimientos_score", "propuestas", "cuotas_vencidas", "creditos", "clientes", "app_estado"]) {
    db.exec(`DELETE FROM ${t}`);
  }
  db.exec("DELETE FROM sqlite_sequence");
  db.exec("PRAGMA foreign_keys = ON");
  seedSiVacio(db);
  return db;
}
