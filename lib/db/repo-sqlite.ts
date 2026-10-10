import type { Movimiento } from "@/lib/score";
import { FECHA_DEMO_INICIAL } from "@/lib/fecha";
import { getDb, resetDb } from "./sqlite";
import type { CampanaRow, ClienteRow, CreditoRow, CuotaRow, EventoRow, MovimientoRow, PreguntaRow, PropuestaRow, Repo } from "./repo";

const parseProp = (r: any): PropuestaRow => ({ ...r, cronograma: JSON.parse(r.cronograma) });
const parseCamp = (r: any): CampanaRow => ({ ...r, recargos: JSON.parse(r.recargos) });
const parseEv = (r: any): EventoRow => ({ ...r, detalle: r.detalle ? JSON.parse(r.detalle) : {} });

export function crearRepoSqlite(): Repo {
  const db = () => getDb();
  return {
    fechaDemo: () => ((db().prepare("SELECT valor FROM app_estado WHERE clave='fecha_demo'").get() as { valor: string } | undefined)?.valor ?? FECHA_DEMO_INICIAL),
    setFechaDemo: (f) => void db().prepare("INSERT OR REPLACE INTO app_estado (clave,valor) VALUES ('fecha_demo',?)").run(f),
    reset: () => void resetDb(),

    cliente: (id) => db().prepare("SELECT * FROM clientes WHERE id=?").get(id) as ClienteRow | undefined,
    clientes: () => db().prepare("SELECT * FROM clientes ORDER BY id").all() as ClienteRow[],
    actualizarScoreCliente: (id, score, nivel) => void db().prepare("UPDATE clientes SET score=?, nivel=? WHERE id=?").run(score, nivel, id),
    setSinBeneficios: (id, v) => void db().prepare("UPDATE clientes SET sin_beneficios=? WHERE id=?").run(v ? 1 : 0, id),

    campanasDeCliente: (cid) => (db().prepare("SELECT * FROM campanas WHERE cliente_id=? ORDER BY id DESC").all(cid) as any[]).map(parseCamp),
    todasLasCampanas: () => (db().prepare("SELECT * FROM campanas ORDER BY id").all() as any[]).map(parseCamp),
    crearCampana: (c) => {
      const creado = new Date().toISOString();
      const id = Number(db().prepare("INSERT INTO campanas (cliente_id,tipo,base,descuento,monto_hoy,recargos,estado,otorgada_por,vence,creado_en) VALUES (?,?,?,?,?,?,?,?,?,?)")
        .run(c.cliente_id, c.tipo, c.base, c.descuento, c.monto_hoy, JSON.stringify(c.recargos), c.estado, c.otorgada_por, c.vence, creado).lastInsertRowid);
      return { ...c, id, creado_en: creado };
    },
    actualizarEstadoCampana: (id, estado) => void db().prepare("UPDATE campanas SET estado=? WHERE id=?").run(estado, id),

    creditoDeCliente: (id) => db().prepare("SELECT * FROM creditos WHERE cliente_id=? ORDER BY id LIMIT 1").get(id) as CreditoRow | undefined,
    actualizarDiasCredito: (id, dias) => void db().prepare("UPDATE creditos SET dias_atraso=? WHERE id=?").run(dias, id),

    cuotas: (creditoId) => db().prepare("SELECT * FROM cuotas_vencidas WHERE credito_id=? ORDER BY fecha_vencimiento").all(creditoId) as CuotaRow[],
    actualizarCuota: (id, patch) => {
      const k = Object.keys(patch) as (keyof typeof patch)[];
      if (!k.length) return;
      db().prepare(`UPDATE cuotas_vencidas SET ${k.map((x) => `${x}=?`).join(",")} WHERE id=?`).run(...k.map((x) => patch[x]), id);
    },

    propuestasDeCredito: (cid) => (db().prepare("SELECT * FROM propuestas WHERE credito_id=? ORDER BY id").all(cid) as any[]).map(parseProp),
    todasLasPropuestas: () => (db().prepare("SELECT * FROM propuestas ORDER BY id").all() as any[]).map(parseProp),
    crearPropuesta: (p) => {
      const creado = new Date().toISOString();
      const id = Number(db().prepare("INSERT INTO propuestas (credito_id,n_cuotas,inicial,fecha_primer_pago,cronograma,estado,motivo_atraso,creado_en) VALUES (?,?,?,?,?,?,?,?)")
        .run(p.credito_id, p.n_cuotas, p.inicial, p.fecha_primer_pago, JSON.stringify(p.cronograma), p.estado, p.motivo_atraso, creado).lastInsertRowid);
      return { ...p, id, creado_en: creado };
    },
    actualizarPropuesta: (id, patch) => {
      if (patch.estado) db().prepare("UPDATE propuestas SET estado=? WHERE id=?").run(patch.estado, id);
      if (patch.cronograma) db().prepare("UPDATE propuestas SET cronograma=? WHERE id=?").run(JSON.stringify(patch.cronograma), id);
    },

    movimientos: (cid) => db().prepare("SELECT tipo,puntos,fecha,detalle FROM movimientos_score WHERE cliente_id=? ORDER BY id").all(cid) as Movimiento[],
    movimientosDetalle: (cid, limite = 50) => db().prepare("SELECT * FROM movimientos_score WHERE cliente_id=? ORDER BY id DESC LIMIT ?").all(cid, limite) as MovimientoRow[],
    insertarMovimiento: (cid, tipo, puntos, detalle, fecha) =>
      void db().prepare("INSERT INTO movimientos_score (cliente_id,tipo,puntos,saldo_resultante,detalle,fecha,creado_en) VALUES (?,?,?,?,?,?,?)").run(cid, tipo, puntos, 0, detalle, fecha, new Date().toISOString()),
    guardarSaldos: (cid, saldos) => {
      const ids = db().prepare("SELECT id FROM movimientos_score WHERE cliente_id=? ORDER BY id").all(cid) as { id: number }[];
      const up = db().prepare("UPDATE movimientos_score SET saldo_resultante=? WHERE id=?");
      db().transaction(() => ids.forEach((r, i) => up.run(saldos[i], r.id)))();
    },

    preguntas: () => (db().prepare("SELECT * FROM trivia_preguntas ORDER BY id").all() as any[]).map((r) => ({ ...r, opciones: JSON.parse(r.opciones) }) as PreguntaRow),
    respuestasDelDia: (cid, fecha) => (db().prepare("SELECT pregunta_id, acerto FROM trivia_respuestas WHERE cliente_id=? AND fecha=? ORDER BY id").all(cid, fecha) as any[]).map((r) => ({ pregunta_id: r.pregunta_id, acerto: !!r.acerto })),
    registrarRespuesta: (cid, pid, acerto, fecha) =>
      void db().prepare("INSERT INTO trivia_respuestas (cliente_id,pregunta_id,acerto,fecha,creado_en) VALUES (?,?,?,?,?)").run(cid, pid, acerto ? 1 : 0, fecha, new Date().toISOString()),

    insertarEvento: (cid, tipo, detalle = {}, creadoEn) => {
      const creado = creadoEn ?? new Date().toISOString();
      const id = Number(db().prepare("INSERT INTO eventos (cliente_id,tipo,detalle,creado_en) VALUES (?,?,?,?)").run(cid, tipo, JSON.stringify(detalle), creado).lastInsertRowid);
      return { id, cliente_id: cid, tipo, detalle, creado_en: creado };
    },
    eventosDesde: (desde, limite) => (db().prepare("SELECT * FROM eventos WHERE id>? ORDER BY id LIMIT ?").all(desde, limite) as any[]).map(parseEv),
    ultimosEventos: (limite) => (db().prepare("SELECT * FROM eventos ORDER BY id DESC LIMIT ?").all(limite) as any[]).map(parseEv),
    eventosDeCliente: (cid) => (db().prepare("SELECT * FROM eventos WHERE cliente_id=? ORDER BY id DESC").all(cid) as any[]).map(parseEv),
    contarEventos: (tipo) => (db().prepare("SELECT COUNT(*) c FROM eventos WHERE tipo=?").get(tipo) as { c: number }).c,
    contarChatsIA: (desde, cid) => {
      const sql = "SELECT COUNT(*) c FROM eventos WHERE tipo='chat' AND json_extract(detalle,'$.fuente')='gemini' AND creado_en>=?";
      const r = (cid ? db().prepare(sql + " AND cliente_id=?").get(desde, cid) : db().prepare(sql).get(desde)) as { c: number };
      return r.c;
    },
    clientesConEvento: (tipo) => (db().prepare("SELECT COUNT(DISTINCT cliente_id) c FROM eventos WHERE tipo=?").get(tipo) as { c: number }).c,
  };
}
