import crypto from "crypto";
import type Database from "better-sqlite3";
import { FECHA_DEMO_INICIAL, sumarDias } from "@/lib/fecha";
import { interesMoratorio } from "@/lib/reglas";
import { TRIVIA } from "./trivia-data";

function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NOMBRES = ["José", "Luis", "Carlos", "Juan", "Miguel", "Pedro", "Manuel", "Segundo", "Santos", "Wilmer", "Jhon", "Cristian", "María", "Rosa", "Juana", "Carmen", "Luz", "Elena", "Marleni", "Flor", "Teresa", "Yesenia", "Milagros", "Nelly", "Gladys"];
const APELLIDOS = ["Ramírez", "Chávez", "Prieto", "Vilchez", "Atoche", "Juárez", "Seminario", "Ruiz", "Navarro", "Calle", "Zapata", "Farfán", "Sánchez", "Cruz", "Huamán", "Rosillo", "Peña", "Neyra", "Yarlequé", "Risco", "Silupú", "Ancajima", "Mogollón", "Nima", "Cornejo"];
const ZONAS = ["Piura", "Castilla", "Sullana", "Paita", "Talara", "Chulucanas", "Sechura", "Catacaos", "Tambogrande"];
const NEGOCIOS: { negocio: string; tipo: string }[] = [
  { negocio: "Bodega", tipo: "Mype comercio" },
  { negocio: "Mototaxi", tipo: "Capital de trabajo" },
  { negocio: "Puesto de mercado", tipo: "Mype comercio" },
  { negocio: "Restaurante", tipo: "Mype servicios" },
  { negocio: "Agricultura (arroz y mango)", tipo: "Agropecuario" },
  { negocio: "Pesca artesanal", tipo: "Pesquero" },
  { negocio: "Panadería", tipo: "Mype producción" },
  { negocio: "Taller mecánico", tipo: "Mype servicios" },
];

export function nivelDe(score: number): "Bronce" | "Plata" | "Oro" {
  return score >= 75 ? "Oro" : score >= 50 ? "Plata" : "Bronce";
}

export function seedSiVacio(db: Database.Database): boolean {
  const n = (db.prepare("SELECT COUNT(*) c FROM clientes").get() as { c: number }).c;
  if (n > 0) return false;
  seed(db);
  return true;
}

export function seed(db: Database.Database) {
  const rnd = mulberry32(20261010);
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const between = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
  const hoy = FECHA_DEMO_INICIAL;
  const ahora = new Date().toISOString();

  const insCliente = db.prepare("INSERT INTO clientes (nombres,dni_hash,dni_mascara,telefono,zona,negocio,score,nivel,creado_en) VALUES (?,?,?,?,?,?,?,?,?)");
  const insCredito = db.prepare("INSERT INTO creditos (cliente_id,tipo_credito,monto_desembolsado,saldo_capital,tea,cuota_mensual,cuotas_pendientes,dias_atraso) VALUES (?,?,?,?,?,?,?,?)");
  const insCuota = db.prepare("INSERT INTO cuotas_vencidas (credito_id,monto,fecha_vencimiento,dias_atraso,interes_moratorio) VALUES (?,?,?,?,?)");
  const insMov = db.prepare("INSERT INTO movimientos_score (cliente_id,tipo,puntos,saldo_resultante,detalle,fecha,creado_en) VALUES (?,?,?,?,?,?,?)");

  const tx = db.transaction(() => {
    db.prepare("INSERT OR REPLACE INTO app_estado (clave,valor) VALUES ('fecha_demo',?)").run(hoy);

    const crear = (nombre: string, negocioIdx: number, dias: number, cuota: number, score: number, tea: number, esDemo = false) => {
      const dni = String(between(10000000, 79999999));
      const hash = crypto.createHash("sha256").update(dni).digest("hex");
      const neg = NEGOCIOS[negocioIdx];
      const zona = esDemo ? "Piura" : pick(ZONAS);
      const tel = "9" + String(between(10000000, 99999999));
      const cid = Number(insCliente.run(nombre, hash, "****" + dni.slice(-4), tel, zona, neg.negocio, score, nivelDe(score), ahora).lastInsertRowid);
      const desembolsado = Math.round(cuota * between(10, 24) / 50) * 50;
      const pendientes = between(4, 18);
      const crid = Number(insCredito.run(cid, neg.tipo, desembolsado, Math.round(cuota * pendientes * 0.85), tea, cuota, pendientes, dias).lastInsertRowid);
      // Cuotas vencidas: 1 si <=30 días, 2 si 31-60, 3 si >60 (cada cuota vence ~30 días después de la anterior)
      const nVenc = dias <= 30 ? 1 : dias <= 60 ? 2 : 3;
      for (let i = 0; i < nVenc; i++) {
        const d = dias - 30 * i;
        insCuota.run(crid, cuota, sumarDias(hoy, -d), d, interesMoratorio(cuota, d, tea));
      }
      // Historial previo que justifica el score inicial (para que recalcularScore sea consistente)
      if (score !== 70) insMov.run(cid, score > 70 ? "pago_puntual" : "chicotazo_mora", score - 70, score, "Historial previo al módulo", hoy, ahora);
      return cid;
    };

    // Cliente de demo: 12 días de atraso, cuota S/ 320, score 70
    crear("Gengis Guerrero", 0, 12, 320, 70, 0.38, true);

    // 99 deudores: 60% 1-30 días, 25% 31-60, 15% >60 (59 + 25 + 15 = 99, Gengis ya está en el primer grupo => 60/25/15 con 100)
    const grupos: [number, number, number][] = [[59, 1, 30], [25, 31, 60], [15, 61, 120]];
    for (const [cant, min, max] of grupos) {
      for (let i = 0; i < cant; i++) {
        const nombre = `${pick(NOMBRES)} ${pick(APELLIDOS)} ${pick(APELLIDOS)}`;
        const dias = between(min, max);
        const cuota = between(80, 1500);
        const score = Math.max(15, Math.min(95, between(35, 90) - (dias > 60 ? 15 : 0)));
        crear(nombre, between(0, NEGOCIOS.length - 1), dias, cuota, score, [0.28, 0.32, 0.38, 0.45][between(0, 3)]);
      }
    }

    const insT = db.prepare("INSERT INTO trivia_preguntas (categoria,pregunta,opciones,correcta,explicacion) VALUES (?,?,?,?,?)");
    for (const t of TRIVIA) insT.run(t.categoria, t.pregunta, JSON.stringify(t.opciones), t.correcta, t.explicacion);
  });
  tx();
}
