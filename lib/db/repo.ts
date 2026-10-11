// Interfaz de acceso a datos. Hoy hay una sola implementación (SQLite local, lib/db/repo-sqlite.ts).
// ROADMAP: una implementación Supabase/Postgres con Realtime solo tendría que cumplir esta interfaz.
import type { Movimiento } from "@/lib/score";
import type { Nivel } from "@/lib/niveles";
import { crearRepoSqlite } from "./repo-sqlite";

export interface ClienteRow { id: number; nombres: string; dni_hash: string; dni_mascara: string; telefono: string; zona: string; negocio: string; score: number; nivel: Nivel; sin_beneficios: 0 | 1; creado_en: string }
export interface CreditoRow { id: number; cliente_id: number; tipo_credito: string; monto_desembolsado: number; saldo_capital: number; tea: number; cuota_mensual: number; cuotas_pendientes: number; dias_atraso: number }
/** pagada: 0 = vencida, 1 = pagada, 2 = reprogramada (incluida en un plan aceptado) */
export interface CuotaRow { id: number; credito_id: number; monto: number; fecha_vencimiento: string; dias_atraso: number; interes_moratorio: number; pagada: 0 | 1 | 2 }
export interface PagoPlan { n: number; fecha: string; monto: number; tipo: "inicial" | "cuota"; pagado: boolean }
export type EstadoPropuesta = "aceptada" | "rechazada" | "derivada" | "cumplida" | "incumplida";
export interface PropuestaRow { id: number; credito_id: number; n_cuotas: number; inicial: number; fecha_primer_pago: string; cronograma: PagoPlan[]; estado: EstadoPropuesta; motivo_atraso: string | null; creado_en: string }
export interface MovimientoRow { id: number; cliente_id: number; tipo: Movimiento["tipo"]; puntos: number; saldo_resultante: number; detalle: string | null; fecha: string; creado_en: string }
export interface PreguntaRow { id: number; categoria: string; pregunta: string; opciones: string[]; correcta: number; explicacion: string }
export type TipoEvento = "aviso_enviado" | "modulo_abierto" | "simulacion" | "propuesta_enviada" | "pago_registrado" | "chat" | "trivia_jugada" | "ayuda_humana" | "promesa_incumplida" | "regalo_otorgado" | "regalo_usado";
export interface CampanaRow { id: number; cliente_id: number; tipo: "regalo_salvador"; base: number; descuento: number; monto_hoy: number; recargos: { n: number; fecha: string; monto: number }[]; estado: "ofrecida" | "usada" | "vencida"; otorgada_por: string; vence: string; creado_en: string }
export interface EventoRow { id: number; cliente_id: number; tipo: TipoEvento; detalle: Record<string, unknown>; creado_en: string }

export interface Repo {
  fechaHoy(): string;
  setFechaHoy(f: string): void;
  reset(): void;

  cliente(id: number): ClienteRow | undefined;
  clientes(): ClienteRow[];
  actualizarScoreCliente(id: number, score: number, nivel: Nivel): void;
  setSinBeneficios(id: number, valor: boolean): void;

  campanasDeCliente(clienteId: number): CampanaRow[];
  todasLasCampanas(): CampanaRow[];
  crearCampana(c: Omit<CampanaRow, "id" | "creado_en">): CampanaRow;
  actualizarEstadoCampana(id: number, estado: CampanaRow["estado"]): void;
  creditoDeCliente(clienteId: number): CreditoRow | undefined;
  actualizarDiasCredito(creditoId: number, dias: number): void;

  cuotas(creditoId: number): CuotaRow[];
  actualizarCuota(id: number, patch: Partial<Pick<CuotaRow, "dias_atraso" | "interes_moratorio" | "pagada">>): void;

  propuestasDeCredito(creditoId: number): PropuestaRow[];
  todasLasPropuestas(): PropuestaRow[];
  crearPropuesta(p: Omit<PropuestaRow, "id" | "creado_en">): PropuestaRow;
  actualizarPropuesta(id: number, patch: Partial<Pick<PropuestaRow, "estado" | "cronograma">>): void;

  movimientos(clienteId: number): Movimiento[];
  movimientosDetalle(clienteId: number, limite?: number): MovimientoRow[];
  insertarMovimiento(clienteId: number, tipo: Movimiento["tipo"], puntos: number, detalle: string, fecha: string): void;
  guardarSaldos(clienteId: number, saldos: number[]): void;

  preguntas(): PreguntaRow[];
  respuestasDelDia(clienteId: number, fecha: string): { pregunta_id: number; acerto: boolean }[];
  registrarRespuesta(clienteId: number, preguntaId: number, acerto: boolean, fecha: string): void;

  insertarEvento(clienteId: number, tipo: TipoEvento, detalle?: Record<string, unknown>, creadoEn?: string): EventoRow;
  eventosDesde(idDesde: number, limite: number): EventoRow[];
  ultimosEventos(limite: number): EventoRow[];
  eventosDeCliente(clienteId: number): EventoRow[];
  contarEventos(tipo: TipoEvento): number;
  clientesConEvento(tipo: TipoEvento): number;
  /** Ids de clientes que tienen al menos un evento de este tipo (una sola consulta). */
  idsConEvento(tipo: TipoEvento): number[];
  /** Respuestas generadas por IA desde una fecha ISO (para los cupos del asistente). */
  contarChatsIA(desdeIso: string, clienteId?: number): number;
}

const g = globalThis as unknown as { __repo?: Repo };
export function getRepo(): Repo {
  return (g.__repo ??= crearRepoSqlite());
}
