import path from "path";
import fs from "fs";
import { resetDb } from "../lib/db/sqlite";

const ruta = process.env.SQLITE_PATH ?? path.join(process.cwd(), "data", "ponte.db");
for (const s of ["", "-wal", "-shm"]) fs.rmSync(ruta + s, { force: true });
const db = resetDb();
const c = (db.prepare("SELECT COUNT(*) c FROM clientes").get() as { c: number }).c;
const t = (db.prepare("SELECT COUNT(*) c FROM trivia_preguntas").get() as { c: number }).c;
console.log(`Seed listo: ${c} clientes, ${t} preguntas de trivia.`);
