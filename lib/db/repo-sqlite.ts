import type { Movimiento } from "@/lib/score";
import { hoyReal, sumarDias } from "@/lib/fecha";
import type Database from "better-sqlite3";
import { getDb, resetDb } from "./sqlite";
import type { Gasto, Ingreso } from "@/lib/finanzas";
import type { CampanaRow, ClienteRow, CreditoRow, CuotaRow, EventoRow, MovimientoRow, PreguntaRow, PropuestaRow, Repo } from "./repo";

const parseProp = (r: any): PropuestaRow => ({ ...r, cronograma: JSON.parse(r.cronograma) });
const parseCamp = (r: any): CampanaRow => ({ ...r, recargos: JSON.parse(r.recargos) });
const parseEv = (r: any): EventoRow => ({ ...r, detalle: r.detalle ? JSON.parse(r.detalle) : {} });

// Sentencias preparadas una sola vez y reutilizadas (compilar SQL en cada consulta es lo más caro de SQLite)
const sentencias = new Map<string, Database.Statement>();
function prep(sql: string): Database.Statement {
  let st = sentencias.get(sql);
  if (!st) { st = getDb().prepare(sql); sentencias.set(sql, st); }
  return st;
}

const leerEstado = (_d: ReturnType<typeof getDb>, clave: string) => (prep("SELECT valor FROM app_estado WHERE clave=?").get(clave) as { valor: string } | undefined)?.valor;
const guardarEstado = (_d: ReturnType<typeof getDb>, clave: string, valor: string) => void prep("INSERT OR REPLACE INTO app_estado (clave,valor) VALUES (?,?)").run(clave, valor);

/** UPDATE con solo las columnas presentes en `patch` (nombres de columna fijos del código, nunca del usuario). */
function actualizar(_d: ReturnType<typeof getDb>, tabla: "clientes" | "creditos", id: number, patch: Record<string, unknown>) {
  const k = Object.keys(patch).filter((x) => patch[x] !== undefined);
  if (!k.length) return;
  prep(`UPDATE ${tabla} SET ${k.map((x) => `${x}=?`).join(",")} WHERE id=?`).run(...k.map((x) => patch[x]), id);
}

export function crearRepoSqlite(): Repo {
  const db = () => getDb();
  return {
    fechaHoy: () => sumarDias(hoyReal(), Number(leerEstado(db(), "dias_adelantados") ?? 0)),
    diasAdelantados: () => Number(leerEstado(db(), "dias_adelantados") ?? 0),
    setDiasAdelantados: (n) => guardarEstado(db(), "dias_adelantados", String(n)),
    fechaProcesada: () => leerEstado(db(), "fecha_procesada"),
    setFechaProcesada: (f) => guardarEstado(db(), "fecha_procesada", f),
    reset: () => void resetDb(),

    cliente: (id) => prep("SELECT * FROM clientes WHERE id=?").get(id) as ClienteRow | undefined,
    clientePorDniHash: (h) => prep("SELECT * FROM clientes WHERE dni_hash=? ORDER BY id LIMIT 1").get(h) as ClienteRow | undefined,
    crearClienteConCredito: (c, cr) => {
      const clienteId = Number(prep("INSERT INTO clientes (nombres,dni_hash,dni_mascara,telefono,zona,negocio,score,nivel,creado_en) VALUES (?,?,?,?,?,?,?,?,?)")
        .run(c.nombres, c.dni_hash, c.dni_mascara, c.telefono, c.zona, c.negocio, c.score, c.nivel, new Date().toISOString()).lastInsertRowid);
      const creditoId = Number(prep("INSERT INTO creditos (cliente_id,tipo_credito,monto_desembolsado,saldo_capital,tea,cuota_mensual,cuotas_pendientes,dias_atraso) VALUES (?,?,?,?,?,?,?,?)")
        .run(clienteId, cr.tipo_credito, cr.monto_desembolsado, cr.saldo_capital, cr.tea, cr.cuota_mensual, cr.cuotas_pendientes, cr.dias_atraso).lastInsertRowid);
      return { clienteId, creditoId };
    },
    actualizarDatosCliente: (id, patch) => actualizar(db(), "clientes", id, patch),
    actualizarCredito: (id, patch) => actualizar(db(), "creditos", id, patch),
    crearCuota: (crid, monto, fecha, dias, interes) => void prep("INSERT INTO cuotas_vencidas (credito_id,monto,fecha_vencimiento,dias_atraso,interes_moratorio) VALUES (?,?,?,?,?)").run(crid, monto, fecha, dias, interes),
    clientes: () => prep("SELECT * FROM clientes ORDER BY id").all() as ClienteRow[],
    actualizarScoreCliente: (id, score, nivel) => void prep("UPDATE clientes SET score=?, nivel=? WHERE id=?").run(score, nivel, id),
    setSinBeneficios: (id, v) => void prep("UPDATE clientes SET sin_beneficios=? WHERE id=?").run(v ? 1 : 0, id),

    campanasDeCliente: (cid) => (prep("SELECT * FROM campanas WHERE cliente_id=? ORDER BY id DESC").all(cid) as any[]).map(parseCamp),
    todasLasCampanas: () => (prep("SELECT * FROM campanas ORDER BY id").all() as any[]).map(parseCamp),
    crearCampana: (c) => {
      const creado = new Date().toISOString();
      const id = Number(prep("INSERT INTO campanas (cliente_id,tipo,base,descuento,monto_hoy,recargos,estado,otorgada_por,vence,creado_en) VALUES (?,?,?,?,?,?,?,?,?,?)")
        .run(c.cliente_id, c.tipo, c.base, c.descuento, c.monto_hoy, JSON.stringify(c.recargos), c.estado, c.otorgada_por, c.vence, creado).lastInsertRowid);
      return { ...c, id, creado_en: creado };
    },
    actualizarEstadoCampana: (id, estado) => void prep("UPDATE campanas SET estado=? WHERE id=?").run(estado, id),

    creditoDeCliente: (id) => prep("SELECT * FROM creditos WHERE cliente_id=? ORDER BY id LIMIT 1").get(id) as CreditoRow | undefined,
    actualizarDiasCredito: (id, dias) => void prep("UPDATE creditos SET dias_atraso=? WHERE id=?").run(dias, id),

    cuotas: (creditoId) => prep("SELECT * FROM cuotas_vencidas WHERE credito_id=? ORDER BY fecha_vencimiento").all(creditoId) as CuotaRow[],
    actualizarCuota: (id, patch) => {
      const k = Object.keys(patch) as (keyof typeof patch)[];
      if (!k.length) return;
      prep(`UPDATE cuotas_vencidas SET ${k.map((x) => `${x}=?`).join(",")} WHERE id=?`).run(...k.map((x) => patch[x]), id);
    },

    propuestasDeCredito: (cid) => (prep("SELECT * FROM propuestas WHERE credito_id=? ORDER BY id").all(cid) as any[]).map(parseProp),
    todasLasPropuestas: () => (prep("SELECT * FROM propuestas ORDER BY id").all() as any[]).map(parseProp),
    crearPropuesta: (p) => {
      const creado = new Date().toISOString();
      const id = Number(prep("INSERT INTO propuestas (credito_id,n_cuotas,inicial,fecha_primer_pago,cronograma,estado,motivo_atraso,creado_en) VALUES (?,?,?,?,?,?,?,?)")
        .run(p.credito_id, p.n_cuotas, p.inicial, p.fecha_primer_pago, JSON.stringify(p.cronograma), p.estado, p.motivo_atraso, creado).lastInsertRowid);
      return { ...p, id, creado_en: creado };
    },
    actualizarPropuesta: (id, patch) => {
      if (patch.estado) prep("UPDATE propuestas SET estado=? WHERE id=?").run(patch.estado, id);
      if (patch.cronograma) prep("UPDATE propuestas SET cronograma=? WHERE id=?").run(JSON.stringify(patch.cronograma), id);
    },

    movimientos: (cid) => prep("SELECT tipo,puntos,fecha,detalle FROM movimientos_score WHERE cliente_id=? ORDER BY id").all(cid) as Movimiento[],
    movimientosDetalle: (cid, limite = 50) => prep("SELECT * FROM movimientos_score WHERE cliente_id=? ORDER BY id DESC LIMIT ?").all(cid, limite) as MovimientoRow[],
    insertarMovimiento: (cid, tipo, puntos, detalle, fecha) =>
      void prep("INSERT INTO movimientos_score (cliente_id,tipo,puntos,saldo_resultante,detalle,fecha,creado_en) VALUES (?,?,?,?,?,?,?)").run(cid, tipo, puntos, 0, detalle, fecha, new Date().toISOString()),
    guardarSaldos: (cid, saldos) => {
      const ids = prep("SELECT id FROM movimientos_score WHERE cliente_id=? ORDER BY id").all(cid) as { id: number }[];
      const up = prep("UPDATE movimientos_score SET saldo_resultante=? WHERE id=?");
      db().transaction(() => ids.forEach((r, i) => up.run(saldos[i], r.id)))();
    },

    preguntas: () => (prep("SELECT * FROM trivia_preguntas ORDER BY id").all() as any[]).map((r) => ({ ...r, opciones: JSON.parse(r.opciones) }) as PreguntaRow),
    respuestasDelDia: (cid, fecha) => (prep("SELECT pregunta_id, acerto FROM trivia_respuestas WHERE cliente_id=? AND fecha=? ORDER BY id").all(cid, fecha) as any[]).map((r) => ({ pregunta_id: r.pregunta_id, acerto: !!r.acerto })),
    registrarRespuesta: (cid, pid, acerto, fecha) =>
      void prep("INSERT INTO trivia_respuestas (cliente_id,pregunta_id,acerto,fecha,creado_en) VALUES (?,?,?,?,?)").run(cid, pid, acerto ? 1 : 0, fecha, new Date().toISOString()),

    insertarEvento: (cid, tipo, detalle = {}, creadoEn) => {
      const creado = creadoEn ?? new Date().toISOString();
      const id = Number(prep("INSERT INTO eventos (cliente_id,tipo,detalle,creado_en) VALUES (?,?,?,?)").run(cid, tipo, JSON.stringify(detalle), creado).lastInsertRowid);
      return { id, cliente_id: cid, tipo, detalle, creado_en: creado };
    },
    eventosDesde: (desde, limite) => (prep("SELECT * FROM eventos WHERE id>? ORDER BY id LIMIT ?").all(desde, limite) as any[]).map(parseEv),
    ultimosEventos: (limite) => (prep("SELECT * FROM eventos ORDER BY id DESC LIMIT ?").all(limite) as any[]).map(parseEv),
    eventosDeCliente: (cid) => (prep("SELECT * FROM eventos WHERE cliente_id=? ORDER BY id DESC").all(cid) as any[]).map(parseEv),
    contarEventos: (tipo) => (prep("SELECT COUNT(*) c FROM eventos WHERE tipo=?").get(tipo) as { c: number }).c,
    contarChatsIA: (desde, cid) => {
      const sql = "SELECT COUNT(*) c FROM eventos WHERE tipo='chat' AND json_extract(detalle,'$.fuente') IN ('gemini','openai') AND creado_en>=?";
      const r = (cid ? prep(sql + " AND cliente_id=?").get(desde, cid) : prep(sql).get(desde)) as { c: number };
      return r.c;
    },
    // Mis Finanzas
    ingresos: (cid) => prep("SELECT id, nombre, monto, frecuencia, fecha FROM fin_ingresos WHERE cliente_id=? ORDER BY id").all(cid) as Ingreso[],
    guardarIngreso: (cid, i) => {
      if (i.id) { prep("UPDATE fin_ingresos SET nombre=?, monto=?, frecuencia=? WHERE id=? AND cliente_id=?").run(i.nombre, i.monto, i.frecuencia, i.id, cid); return i.id; }
      return Number(prep("INSERT INTO fin_ingresos (cliente_id,nombre,monto,frecuencia,fecha,creado_en) VALUES (?,?,?,?,?,?)").run(cid, i.nombre, i.monto, i.frecuencia, i.fecha, new Date().toISOString()).lastInsertRowid);
    },
    borrarIngreso: (cid, id) => prep("DELETE FROM fin_ingresos WHERE id=? AND cliente_id=?").run(id, cid).changes > 0,
    gastos: (cid) => prep("SELECT id, nombre, monto, categoria, fecha, tipo, ambito FROM fin_gastos WHERE cliente_id=? ORDER BY fecha DESC, id DESC").all(cid) as Gasto[],
    guardarGasto: (cid, g) => {
      if (g.id) { prep("UPDATE fin_gastos SET nombre=?, monto=?, categoria=?, fecha=?, tipo=?, ambito=? WHERE id=? AND cliente_id=?").run(g.nombre, g.monto, g.categoria, g.fecha, g.tipo, g.ambito, g.id, cid); return g.id; }
      return Number(prep("INSERT INTO fin_gastos (cliente_id,nombre,monto,categoria,fecha,tipo,ambito,creado_en) VALUES (?,?,?,?,?,?,?,?)").run(cid, g.nombre, g.monto, g.categoria, g.fecha, g.tipo, g.ambito, new Date().toISOString()).lastInsertRowid);
    },
    borrarGasto: (cid, id) => prep("DELETE FROM fin_gastos WHERE id=? AND cliente_id=?").run(id, cid).changes > 0,
    categoriasPropias: (cid) => prep("SELECT id, nombre, color, icono FROM fin_categorias WHERE cliente_id=? ORDER BY id").all(cid) as { id: number; nombre: string; color: string; icono: string }[],
    crearCategoria: (cid, c) => Number(prep("INSERT INTO fin_categorias (cliente_id,nombre,color,icono) VALUES (?,?,?,?)").run(cid, c.nombre, c.color, c.icono).lastInsertRowid),
    idsConEvento: (tipo) => (prep("SELECT DISTINCT cliente_id FROM eventos WHERE tipo=?").all(tipo) as { cliente_id: number }[]).map((r) => r.cliente_id),
    clientesConEvento: (tipo) => (prep("SELECT COUNT(DISTINCT cliente_id) c FROM eventos WHERE tipo=?").get(tipo) as { c: number }).c,
  };
}
