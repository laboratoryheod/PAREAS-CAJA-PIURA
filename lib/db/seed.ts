import crypto from "crypto";
import type Database from "better-sqlite3";
import { FECHA_DEMO_INICIAL, sumarDias } from "@/lib/fecha";
import { interesMoratorio, validarPropuesta } from "@/lib/reglas";
import { generarCronograma } from "@/lib/cronograma";
import { TRIVIA } from "./trivia-data";
import { nivelDe } from "@/lib/niveles";

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

    sembrarActividad(db, rnd, hoy);

    const insT = db.prepare("INSERT INTO trivia_preguntas (categoria,pregunta,opciones,correcta,explicacion) VALUES (?,?,?,?,?)");
    for (const t of TRIVIA) insT.run(t.categoria, t.pregunta, JSON.stringify(t.opciones), t.correcta, t.explicacion);
  });
  tx();
}


/** Actividad previa ficticia para que el dashboard del banco no arranque vacío. Gengis (id 1) queda sin tocar. */
function sembrarActividad(db: Database.Database, rnd: () => number, hoy: string) {
  const insEv = db.prepare("INSERT INTO eventos (cliente_id,tipo,detalle,creado_en) VALUES (?,?,?,?)");
  const haceMin = (m: number) => new Date(Date.now() - m * 60000).toISOString();
  const filas = db.prepare(`SELECT c.id, c.score, cr.id AS credito_id, cr.dias_atraso FROM clientes c JOIN creditos cr ON cr.cliente_id=c.id WHERE c.id>1 ORDER BY c.id`).all() as
    { id: number; score: number; credito_id: number; dias_atraso: number }[];
  const ev = (cid: number, tipo: string, det: object, min: number) => insEv.run(cid, tipo, JSON.stringify(det), haceMin(min));

  // Todos recibieron su aviso; ~40% abrió el módulo; ~25% simuló
  insEv.run(1, "aviso_enviado", "{}", haceMin(300));
  const abrieron: typeof filas = [];
  for (const f of filas) {
    ev(f.id, "aviso_enviado", { canal: "push" }, 240 + Math.floor(rnd() * 60));
    if (rnd() < 0.4) { ev(f.id, "modulo_abierto", {}, 30 + Math.floor(rnd() * 200)); abrieron.push(f); }
  }
  for (const f of abrieron) if (rnd() < 0.6) ev(f.id, "simulacion", {}, 20 + Math.floor(rnd() * 100));

  const motivos = ["olvido", "bajaron_ventas", "salud", "otro"];
  let aceptadas = 0, derivadas = 0;
  const insProp = db.prepare("INSERT INTO propuestas (credito_id,n_cuotas,inicial,fecha_primer_pago,cronograma,estado,motivo_atraso,creado_en) VALUES (?,?,?,?,?,?,?,?)");
  const marcar = db.prepare("UPDATE cuotas_vencidas SET pagada=2 WHERE credito_id=?");
  const diasCred = db.prepare("UPDATE creditos SET dias_atraso=0 WHERE id=?");
  for (const f of abrieron) {
    const cuotas = db.prepare("SELECT monto, interes_moratorio FROM cuotas_vencidas WHERE credito_id=?").all(f.credito_id) as { monto: number; interes_moratorio: number }[];
    const credito = { diasAtraso: f.dias_atraso, montoVencido: cuotas.reduce((a, c) => a + c.monto, 0), interesMoratorio: cuotas.reduce((a, c) => a + c.interes_moratorio, 0), reprogramacionActiva: false };
    const min = Math.floor(rnd() * 90) + 2;
    if (f.dias_atraso <= 60 && aceptadas < 10) {
      const n = f.dias_atraso <= 15 ? 2 : 3;
      const v = validarPropuesta(credito, { score: f.score }, { nCuotas: n, inicial: 0, fechaPrimerPago: sumarDias(hoy, 7) }, hoy);
      const plan = v.aceptable ? { nCuotas: n, inicial: 0, fechaPrimerPago: sumarDias(hoy, 7) } : v.contrapropuesta;
      if (!plan) continue;
      const cron = generarCronograma({ deuda: v.limites.deuda, ...plan, hoy });
      // Planes ya en marcha (hicieron su 1er pago) y algunos aceptados sin iniciar (el Pacaso sigue pegando)
      const iniciado = aceptadas < 6 || plan.inicial > 0; // un plan con inicial sin pagar se incumpliría al día siguiente
      insProp.run(f.credito_id, plan.nCuotas, plan.inicial, plan.fechaPrimerPago, JSON.stringify(cron.pagos.map((p, i) => ({ ...p, pagado: iniciado && i === 0 }))), "aceptada", motivos[Math.floor(rnd() * 4)], haceMin(min));
      if (iniciado) { marcar.run(f.credito_id); diasCred.run(f.credito_id); }
      ev(f.id, "propuesta_enviada", { estado: "aceptada", nCuotas: plan.nCuotas, inicial: plan.inicial, total: cron.total }, min);
      aceptadas++;
    } else if (f.dias_atraso > 60 && derivadas < 3) {
      const v = validarPropuesta(credito, { score: f.score }, { nCuotas: 4, inicial: 0, fechaPrimerPago: sumarDias(hoy, 7) }, hoy);
      const plan = v.contrapropuesta ?? { nCuotas: 4, inicial: v.limites.inicialMin, fechaPrimerPago: sumarDias(hoy, 7) };
      const cron = generarCronograma({ deuda: v.limites.deuda, ...plan, hoy });
      insProp.run(f.credito_id, plan.nCuotas, plan.inicial, plan.fechaPrimerPago, JSON.stringify(cron.pagos.map((p) => ({ ...p, pagado: false }))), "derivada", motivos[Math.floor(rnd() * 4)], haceMin(min));
      ev(f.id, "propuesta_enviada", { estado: "derivada", nCuotas: plan.nCuotas, inicial: plan.inicial, total: cron.total }, min);
      derivadas++;
    }
  }
  // Dos clientes incumplieron un plan anterior: sin beneficios (candidatos a Regalo Salvador)
  const conPropuesta = new Set((db.prepare("SELECT credito_id FROM propuestas").all() as { credito_id: number }[]).map((r) => r.credito_id));
  for (const f of filas.filter((x) => x.dias_atraso >= 16 && x.dias_atraso <= 45 && !conPropuesta.has(x.credito_id)).slice(0, 2)) {
    insProp.run(f.credito_id, 2, 0, sumarDias(hoy, -10), JSON.stringify([{ n: 1, fecha: sumarDias(hoy, -10), monto: 100, tipo: "cuota", pagado: false }]), "incumplida", "bajaron_ventas", haceMin(600));
    db.prepare("UPDATE clientes SET sin_beneficios=1 WHERE id=?").run(f.id);
    ev(f.id, "promesa_incumplida", {}, 50 + Math.floor(rnd() * 40));
  }

  // Dos clientes pidieron ayuda humana
  for (const f of filas.filter((x) => x.dias_atraso > 30).slice(0, 2)) ev(f.id, "ayuda_humana", { nota: "Quiero hablar con una persona" }, 15 + Math.floor(rnd() * 30));
}
