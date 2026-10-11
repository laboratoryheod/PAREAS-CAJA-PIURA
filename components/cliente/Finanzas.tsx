"use client";
// MIS FINANZAS: calculadora de ingresos y gastos que asesora al cliente y le recuerda separar su cuota.
// Todos los totales, porcentajes, semáforo y consejos vienen del servidor (/api/finanzas); aquí solo se muestran.
// Pensado también para adultos mayores: letra grande, botones de 48 px o más, una acción principal y textos simples.
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { api, soles, type Situacion } from "@/lib/cliente-api";
import type { finanzasCliente } from "@/lib/servicio";
import { TextureButton } from "@/components/ui/texture-button";
import {
  IcAlerta, IcAtras, IcBasura, IcBilletera, IcBus, IcCanasta, IcCandado, IcCerrar, IcCheck, IcCorazon,
  IcEstrella, IcEtiqueta, IcGestor, IcInicio, IcLapiz, IcLibro, IcMas, IcSalud, IcTarjeta, IcTienda,
} from "@/components/iconos";
import { cn } from "@/lib/utils";

type Datos = ReturnType<typeof finanzasCliente>;
type Categoria = Datos["categorias"][number];
type Gasto = Datos["gastos"][number];
type Ingreso = Datos["ingresos"][number];
type Filtro = "todos" | "personal" | "negocio";

const ICONOS = { canasta: IcCanasta, casa: IcInicio, bus: IcBus, salud: IcSalud, libro: IcLibro, tienda: IcTienda, tarjeta: IcTarjeta, etiqueta: IcEtiqueta, estrella: IcEstrella, corazon: IcCorazon } as const;
const COLORES_PROPIOS = ["#D6247A", "#FF7A59", "#0FA5A0", "#2F8CFF", "#7B2FF7", "#1DA851"];
const ICONOS_PROPIOS = ["estrella", "corazon", "etiqueta", "canasta", "tienda", "casa"] as const;
const FRECUENCIAS = [["mensual", "Cada mes"], ["quincenal", "Cada quincena"], ["semanal", "Cada semana"], ["unico", "Una sola vez"]] as const;

const SEMAFORO = {
  verde: { texto: "Va bien", detalle: "Le sobra más del 20 % de lo que gana.", fondo: "bg-[#E6F6EC]", tinta: "text-[#11713A]", punto: "bg-[#1DA851]" },
  amarillo: { texto: "Atención", detalle: "Le sobra entre el 5 % y el 20 % de lo que gana.", fondo: "bg-[#FFF4DB]", tinta: "text-[#8A5A00]", punto: "bg-[#E89B00]" },
  rojo: { texto: "Cuidado", detalle: "Le sobra menos del 5 % o le falta dinero.", fondo: "bg-[#FDE7EA]", tinta: "text-[#A1121F]", punto: "bg-[#C9182B]" },
  sin_datos: { texto: "Faltan datos", detalle: "Registre sus ingresos para ver cómo va.", fondo: "bg-neutral-100", tinta: "text-neutral-700", punto: "bg-neutral-400" },
} as const;

function IconoCategoria({ c, tam = 40 }: { c: Pick<Categoria, "icono" | "color">; tam?: number }) {
  const I = ICONOS[c.icono as keyof typeof ICONOS] ?? IcEtiqueta;
  return (
    <span className="inline-flex shrink-0 items-center justify-center text-white" style={{ width: tam, height: tam, borderRadius: tam * 0.26, background: c.color }} aria-hidden>
      <I tam={tam * 0.55} strokeWidth={2} />
    </span>
  );
}

export default function Finanzas({ clienteId, onVolver, onPagar, onAsistente }: { sit: Situacion; clienteId: number; onVolver: () => void; onPagar: () => void; onAsistente: () => void }) {
  const [d, setD] = useState<Datos | null>(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [hoja, setHoja] = useState<null | { tipo: "gasto"; gasto?: Gasto } | { tipo: "ingreso"; ingreso?: Ingreso } | { tipo: "etiqueta" }>(null);
  const [borrar, setBorrar] = useState<null | { tipo: "gasto" | "ingreso"; id: number; nombre: string }>(null);

  const cargar = useCallback(() => api<Datos>(`/api/finanzas?clienteId=${clienteId}`).then(setD).catch((e) => setError(e.message)), [clienteId]);
  useEffect(() => { cargar(); }, [cargar]);

  const avisar = (t: string) => { setAviso(t); setTimeout(() => setAviso(""), 4000); };
  async function accion(accion: string, datos: Record<string, unknown>, ok: string) {
    const r = await api<Datos>("/api/finanzas", { clienteId, accion, datos });
    setD(r); avisar(ok);
    return r;
  }
  async function pedirAsesor() {
    try { const r = await api<{ mensaje: string }>("/api/ayuda", { clienteId, nota: "Pidió un asesor desde Mis Finanzas" }); avisar(r.mensaje); }
    catch (e: any) { avisar(e.message); }
  }
  const verGastos = () => document.getElementById("mis-gastos")?.scrollIntoView({ behavior: "smooth", block: "start" });

  if (error) return <div className="card text-[17px] text-red-700">{error}</div>;
  if (!d) return <div className="h-72 animate-pulse rounded-[28px] bg-white/70" aria-busy="true" aria-label="Cargando Mis Finanzas" />;

  const r = d.resumen;
  const sem = SEMAFORO[r.semaforo];
  const cat = (id: string) => d.categorias.find((c) => c.id === id) ?? d.categorias[d.categorias.length - 1];
  const gastosVisibles = d.gastos.filter((g) => g.delMes && (filtro === "todos" || g.ambito === filtro));
  const grupos = [...new Set(gastosVisibles.map((g) => g.categoria))].map((id) => ({
    c: cat(id), lista: gastosVisibles.filter((g) => g.categoria === id),
    subtotal: r.porCategoria.find((x) => x.categoria === id)?.total ?? 0,
  }));
  const maxCat = Math.max(1, ...r.porCategoria.map((x) => x.total));

  return (
    <div className="space-y-4 text-[17px]">
      <div className="flex items-center gap-3">
        <button onClick={onVolver} aria-label="Volver al inicio" className="grid h-12 w-12 place-items-center rounded-full bg-white text-caja shadow-[0_0_0_1px_#D6E4F5] active:scale-[0.96]"><IcAtras tam={22} /></button>
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em]">Mis Finanzas</h1>
          <p className="text-[16px] text-neutral-600">Sus cuentas de {d.mesLargo}: cuánto le queda para pagar su cuota.</p>
        </div>
      </div>

      {/* Calculadora del mes */}
      <section aria-labelledby="titulo-resumen" className="overflow-hidden rounded-[28px] bg-white shadow-[0_0_0_1px_#D6E4F5]">
        <h2 id="titulo-resumen" className="sr-only">Resumen del mes</h2>
        <dl className="divide-y divide-black/5 px-5 pt-2 text-[18px]">
          <Linea titulo="Lo que gano al mes" valor={soles(r.ingresos)} />
          <Linea titulo="Mis gastos del mes" valor={`− ${soles(r.gastos)}`} />
          <Linea titulo={d.credito.proxima ? `Cuota de mi crédito (${d.credito.proxima.fechaLarga})` : "Cuota de mi crédito"} valor={`− ${soles(r.cuota)}`} />
          {r.vencido > 0 && <Linea titulo={d.credito.conRescate ? "Mi Modo Rescate (pagar ya)" : "Deuda vencida (pagar ya)"} valor={`− ${soles(r.vencido)}`} rojo />}
        </dl>
        <div className={cn("mt-2 px-5 py-4", sem.fondo)}>
          <p className="text-[16px] font-semibold text-neutral-700">{r.sobra < 0 ? "Me falta" : "Me sobra"}</p>
          <p className={cn("text-[40px] font-bold leading-tight tracking-[-0.03em] tabular-nums", r.sobra < 0 ? "text-[#A1121F]" : "text-[#1C1C1E]")}>{soles(Math.abs(r.sobra))}</p>
          <p className={cn("mt-1 flex items-center gap-2 text-[17px] font-semibold", sem.tinta)}>
            <span className={cn("h-3.5 w-3.5 rounded-full", sem.punto)} aria-hidden />{sem.texto}<span className="font-normal">· {sem.detalle}</span>
          </p>
        </div>
        {r.noAlcanza && (
          <p role="alert" className="flex items-start gap-3 border-t border-[#F5C2C8] bg-[#FDE7EA] px-5 py-4 text-[17px] font-semibold text-[#A1121F]">
            <IcAlerta tam={24} className="mt-0.5 shrink-0" />Este mes su dinero no alcanza para pagar su crédito. Revise sus gastos o hable con un asesor.
          </p>
        )}
      </section>

      {/* Acción principal */}
      <TextureButton variant="primary" size="lg" onClick={() => setHoja({ tipo: "gasto" })}><IcMas tam={24} />Agregar gasto</TextureButton>

      {/* Conexión con el crédito */}
      <section className="rounded-[24px] bg-white p-5 shadow-[0_0_0_1px_#D6E4F5]">
        <h2 className="flex items-center gap-2 text-[20px] font-bold"><IcTarjeta tam={22} className="text-caja" />Mi crédito</h2>
        {d.credito.proxima ? (
          <p className="mt-2 text-[18px]">
            Próxima {d.credito.proxima.concepto === "plan" ? "cuota de su plan" : "cuota"}: <b className="tabular-nums">{soles(d.credito.proxima.monto)}</b>, vence el <b>{d.credito.proxima.fechaLarga}</b>
            {" "}({d.credito.proxima.diasFaltan === 0 ? "vence hoy" : d.credito.proxima.diasFaltan === 1 ? "falta 1 día" : `faltan ${d.credito.proxima.diasFaltan} días`}).
          </p>
        ) : <p className="mt-2 text-[18px]">No tiene cuotas próximas registradas.</p>}
        {r.vencido > 0 && <p className="mt-2 text-[18px] font-semibold text-[#A1121F]">{d.credito.conRescate ? `Con su Modo Rescate paga hoy ${soles(r.vencido)}.` : `Tiene ${soles(r.vencido)} vencidos. Mientras no pague, Pareas le da el CHICOTAZO.`}</p>}
        {r.vencido > 0 && <TextureButton variant="accent" className="mt-3" onClick={onPagar}>Pagar mi deuda</TextureButton>}
      </section>

      {/* Consejos */}
      {d.consejos.length > 0 && (
        <section className="space-y-2" aria-labelledby="titulo-consejos">
          <h2 id="titulo-consejos" className="px-1 text-[22px] font-bold">Consejos para usted</h2>
          {d.consejos.map((c) => (
            <div key={c.id} className={cn("rounded-[22px] p-4 shadow-[0_0_0_1px_#D6E4F5]", c.tono === "alerta" ? "bg-[#FDE7EA]" : c.tono === "bien" ? "bg-[#E6F6EC]" : "bg-white")}>
              <p className="flex items-start gap-3 text-[18px] leading-snug">
                {c.tono === "bien" ? <IcCheck tam={24} className="mt-0.5 shrink-0 text-[#11713A]" /> : <IcAlerta tam={24} className={cn("mt-0.5 shrink-0", c.tono === "alerta" ? "text-[#A1121F]" : "text-[#8A5A00]")} />}
                {c.texto}
              </p>
              {c.accion && (
                <button onClick={() => {
                  const t = c.accion!.tipo;
                  if (t === "pagar") onPagar(); else if (t === "asesor") pedirAsesor(); else if (t === "ver_gastos") verGastos();
                  else if (t === "agregar_ingreso") setHoja({ tipo: "ingreso" }); else setHoja({ tipo: "gasto" });
                }} className="mt-3 flex min-h-[48px] items-center gap-2 rounded-2xl bg-white px-4 text-[17px] font-semibold text-caja shadow-[0_0_0_1px_#B9D3F0] active:scale-[0.98]">
                  {c.accion.tipo === "asesor" && <IcGestor tam={20} />}{c.accion.texto}
                </button>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Gráfico de gastos por categoría (barras con leyenda en texto) */}
      {r.porCategoria.length > 0 && (
        <section className="rounded-[24px] bg-white p-5 shadow-[0_0_0_1px_#D6E4F5]" aria-labelledby="titulo-grafico">
          <h2 id="titulo-grafico" className="text-[20px] font-bold">¿En qué se va mi dinero?</h2>
          <ul className="mt-3 space-y-3">
            {r.porCategoria.map((x) => {
              const c = cat(x.categoria);
              return (
                <li key={x.categoria}>
                  <div className="flex items-center justify-between gap-2 text-[17px]">
                    <span className="flex items-center gap-2 font-semibold"><IconoCategoria c={c} tam={28} />{c.nombre}</span>
                    <span className="tabular-nums"><b>{soles(x.total)}</b> <span className="text-[15px] text-neutral-500">· {Math.round(x.pctGastos)} %</span></span>
                  </div>
                  <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-neutral-100" role="presentation">
                    <div className="h-full rounded-full" style={{ width: `${(x.total / maxCat) * 100}%`, background: c.color }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Gastos agrupados por categoría */}
      <section id="mis-gastos" className="scroll-mt-20 rounded-[24px] bg-white p-5 shadow-[0_0_0_1px_#D6E4F5]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[22px] font-bold">Mis gastos</h2>
          <button onClick={() => setHoja({ tipo: "etiqueta" })} className="flex min-h-[48px] items-center gap-2 rounded-2xl px-3 text-[16px] font-semibold text-caja hover:bg-[#EAF2FC]"><IcEtiqueta tam={20} />Nueva etiqueta</button>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1 rounded-2xl bg-neutral-100 p-1" role="group" aria-label="Ver gastos">
          {([["todos", "Todos"], ["personal", "De mi casa"], ["negocio", "Del negocio"]] as [Filtro, string][]).map(([v, t]) => (
            <button key={v} onClick={() => setFiltro(v)} aria-pressed={filtro === v} className={cn("min-h-[48px] rounded-xl text-[16px] font-semibold transition-colors", filtro === v ? "bg-white text-caja shadow-sm" : "text-neutral-600")}>{t}</button>
          ))}
        </div>
        <p className="mt-2 text-[15px] text-neutral-600">De mi casa: {soles(r.porAmbito.personal)} · Del negocio: {soles(r.porAmbito.negocio)}</p>
        {grupos.length === 0 && <p className="mt-4 text-[17px] text-neutral-600">Aún no tiene gastos aquí este mes. Toque “Agregar gasto” para empezar.</p>}
        <div className="mt-3 space-y-4">
          {grupos.map(({ c, lista }) => (
            <div key={c.id}>
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-[18px] font-bold"><IconoCategoria c={c} tam={32} />{c.nombre}</p>
                <p className="text-[17px] font-semibold tabular-nums">{soles(lista.reduce((s, g) => s + g.monto, 0))}</p>
              </div>
              <ul className="mt-2 divide-y divide-black/5 rounded-2xl bg-neutral-50">
                {lista.map((g) => (
                  <li key={g.id} className="flex flex-wrap items-center gap-2 px-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[17px] font-semibold">{g.nombre}</p>
                      <p className="text-[15px] text-neutral-600">{g.tipo === "fijo" ? "Fijo, cada mes" : g.fechaLarga} · {g.ambito === "negocio" ? "Negocio" : "Casa"}</p>
                    </div>
                    <p className="text-[18px] font-bold tabular-nums">{soles(g.monto)}</p>
                    <div className="flex w-full justify-end gap-2 sm:w-auto">
                      <button onClick={() => setHoja({ tipo: "gasto", gasto: g })} className="flex min-h-[48px] items-center gap-1.5 rounded-xl px-3 text-[16px] font-semibold text-caja hover:bg-[#EAF2FC]" aria-label={`Editar ${g.nombre}`}><IcLapiz tam={18} />Editar</button>
                      <button onClick={() => setBorrar({ tipo: "gasto", id: g.id, nombre: g.nombre })} className="flex min-h-[48px] items-center gap-1.5 rounded-xl px-3 text-[16px] font-semibold text-[#A1121F] hover:bg-[#FDE7EA]" aria-label={`Borrar ${g.nombre}`}><IcBasura tam={18} />Borrar</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Ingresos */}
      <section className="rounded-[24px] bg-white p-5 shadow-[0_0_0_1px_#D6E4F5]">
        <h2 className="flex items-center gap-2 text-[22px] font-bold"><IcBilletera tam={24} className="text-[#1DA851]" />Lo que gano</h2>
        {d.ingresos.length === 0 && <p className="mt-2 text-[17px] text-neutral-600">Registre su sueldo o las ventas de su negocio.</p>}
        <ul className="mt-2 divide-y divide-black/5">
          {d.ingresos.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-2 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[17px] font-semibold">{i.nombre}</p>
                <p className="text-[15px] text-neutral-600">{soles(i.monto)} · {i.frecuenciaTexto}{i.frecuencia === "semanal" || i.frecuencia === "quincenal" ? ` (≈ ${soles(i.mensual)} al mes)` : ""}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setHoja({ tipo: "ingreso", ingreso: i })} className="flex min-h-[48px] items-center gap-1.5 rounded-xl px-3 text-[16px] font-semibold text-caja hover:bg-[#EAF2FC]" aria-label={`Editar ${i.nombre}`}><IcLapiz tam={18} />Editar</button>
                <button onClick={() => setBorrar({ tipo: "ingreso", id: i.id, nombre: i.nombre })} className="flex min-h-[48px] items-center gap-1.5 rounded-xl px-3 text-[16px] font-semibold text-[#A1121F] hover:bg-[#FDE7EA]" aria-label={`Borrar ${i.nombre}`}><IcBasura tam={18} />Borrar</button>
              </div>
            </li>
          ))}
        </ul>
        <TextureButton variant="secondary" className="mt-2" onClick={() => setHoja({ tipo: "ingreso" })}><IcMas tam={20} />Agregar ingreso</TextureButton>
      </section>

      <p className="flex items-start gap-3 rounded-[20px] bg-[#EAF2FC] p-4 text-[16px] font-semibold text-caja">
        <IcCandado tam={22} className="mt-0.5 shrink-0" />Caja Piura nunca le pedirá su clave por mensaje o llamada. Aquí no guardamos claves, tarjetas ni su DNI.
      </p>
      <button onClick={onAsistente} className="w-full text-center text-[16px] font-semibold text-caja-medio underline">¿Dudas? Pregúntele a Pareas</button>

      <AnimatePresence>
        {aviso && <motion.p role="status" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="fixed inset-x-4 bottom-28 z-50 mx-auto max-w-md rounded-[20px] bg-black/85 p-4 text-center text-[17px] font-medium text-white">{aviso}</motion.p>}
      </AnimatePresence>

      <Hoja abierta={!!hoja} titulo={hoja?.tipo === "ingreso" ? (hoja.ingreso ? "Editar ingreso" : "Agregar ingreso") : hoja?.tipo === "etiqueta" ? "Nueva etiqueta" : hoja?.tipo === "gasto" && hoja.gasto ? "Editar gasto" : "Agregar gasto"} onCerrar={() => setHoja(null)}>
        {hoja?.tipo === "gasto" && <FormGasto categorias={d.categorias} hoy={d.hoy} gasto={hoja.gasto}
          onNuevaEtiqueta={() => setHoja({ tipo: "etiqueta" })}
          onGuardar={async (datos) => { await accion("guardar_gasto", datos, hoja.gasto ? "Gasto actualizado." : "Gasto agregado."); setHoja(null); }} />}
        {hoja?.tipo === "ingreso" && <FormIngreso ingreso={hoja.ingreso}
          onGuardar={async (datos) => { await accion("guardar_ingreso", datos, hoja.ingreso ? "Ingreso actualizado." : "Ingreso agregado."); setHoja(null); }} />}
        {hoja?.tipo === "etiqueta" && <FormEtiqueta
          onGuardar={async (datos) => { await accion("crear_categoria", datos, "Etiqueta creada. Ya puede usarla en sus gastos."); setHoja({ tipo: "gasto" }); }} />}
      </Hoja>

      <Hoja abierta={!!borrar} titulo="¿Seguro que quiere borrarlo?" onCerrar={() => setBorrar(null)}>
        {borrar && (
          <div className="space-y-3">
            <p className="text-[18px]">Se borrará “{borrar.nombre}”. Esta acción no se puede deshacer.</p>
            <button onClick={async () => { try { await accion(borrar.tipo === "gasto" ? "borrar_gasto" : "borrar_ingreso", { id: borrar.id }, "Listo, se borró."); } catch (e: any) { avisar(e.message); } setBorrar(null); }}
              className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-[18px] bg-[#C9182B] text-[18px] font-semibold text-white active:scale-[0.98]"><IcBasura tam={22} />Sí, borrar</button>
            <button onClick={() => setBorrar(null)} className="min-h-[56px] w-full rounded-[18px] bg-neutral-100 text-[18px] font-semibold active:scale-[0.98]">No, volver</button>
          </div>
        )}
      </Hoja>
    </div>
  );
}

function Linea({ titulo, valor, rojo }: { titulo: string; valor: string; rojo?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-3">
      <dt className="text-neutral-700">{titulo}</dt>
      <dd className={cn("shrink-0 font-semibold tabular-nums", rojo && "text-[#A1121F]")}>{valor}</dd>
    </div>
  );
}

/** Hoja inferior (modal) para los formularios. */
function Hoja({ abierta, titulo, onCerrar, children }: { abierta: boolean; titulo: string; onCerrar: () => void; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {abierta && (
        <>
          <motion.div className="fixed inset-0 z-[60] bg-black/35" onClick={onCerrar} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div role="dialog" aria-modal="true" aria-label={titulo}
            className="fixed inset-x-0 bottom-0 z-[61] mx-auto max-h-[92vh] max-w-xl overflow-y-auto rounded-t-[28px] bg-white p-5 pb-8 text-[17px] shadow-[0_-10px_40px_rgba(0,30,80,0.25)]"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", bounce: 0, duration: 0.4 }}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-[24px] font-bold tracking-[-0.02em]">{titulo}</h2>
              <button onClick={onCerrar} aria-label="Cerrar" className="grid h-12 w-12 place-items-center rounded-full bg-neutral-100"><IcCerrar tam={22} /></button>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Campo({ etiqueta, children, ayuda }: { etiqueta: string; children: React.ReactNode; ayuda?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[17px] font-semibold">{etiqueta}</span>
      {children}
      {ayuda && <span className="mt-1 block text-[15px] text-neutral-500">{ayuda}</span>}
    </label>
  );
}
const claseInput = "min-h-[56px] w-full rounded-2xl border-2 border-caja-borde bg-white px-4 text-[18px] focus:border-caja-medio focus:outline-none";

function Opciones<T extends string>({ valor, onChange, opciones, etiqueta }: { valor: T; onChange: (v: T) => void; opciones: readonly (readonly [T, string])[]; etiqueta: string }) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className="grid grid-cols-2 gap-2">
      {opciones.map(([v, t]) => (
        <button key={v} type="button" role="radio" aria-checked={valor === v} onClick={() => onChange(v)}
          className={cn("min-h-[52px] rounded-2xl border-2 px-3 text-[17px] font-semibold", valor === v ? "border-caja bg-[#EAF2FC] text-caja" : "border-caja-borde bg-white text-neutral-700")}>{t}</button>
      ))}
    </div>
  );
}

function Guardar({ cargando }: { cargando: boolean }) {
  return <TextureButton type="submit" variant="primary" size="lg" disabled={cargando}>{cargando ? "Guardando…" : "Guardar"}</TextureButton>;
}

function usarEnvio(onGuardar: (d: Record<string, unknown>) => Promise<void>) {
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const enviar = async (d: Record<string, unknown>) => {
    setError(""); setCargando(true);
    try { await onGuardar(d); } catch (e: any) { setError(e.message); } finally { setCargando(false); }
  };
  return { error, cargando, enviar };
}
const MensajeError = ({ texto }: { texto: string }) => texto ? <p role="alert" className="rounded-2xl bg-[#FDE7EA] p-3 text-[17px] font-semibold text-[#A1121F]">{texto}</p> : null;

function FormGasto({ categorias, hoy, gasto, onGuardar, onNuevaEtiqueta }: { categorias: Categoria[]; hoy: string; gasto?: Gasto; onGuardar: (d: Record<string, unknown>) => Promise<void>; onNuevaEtiqueta: () => void }) {
  const [nombre, setNombre] = useState(gasto?.nombre ?? "");
  const [monto, setMonto] = useState(gasto ? String(gasto.monto) : "");
  const [categoria, setCategoria] = useState(gasto?.categoria ?? "");
  const [fecha, setFecha] = useState(gasto?.fecha ?? hoy);
  const [tipo, setTipo] = useState<"fijo" | "variable">(gasto?.tipo ?? "variable");
  const [ambito, setAmbito] = useState<"personal" | "negocio">(gasto?.ambito ?? "personal");
  const { error, cargando, enviar } = usarEnvio(onGuardar);
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); enviar({ id: gasto?.id, nombre, monto, categoria, fecha, tipo, ambito }); }}>
      <Campo etiqueta="¿En qué gastó?"><input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej.: Mercado, Luz, Colegio" maxLength={40} className={claseInput} autoFocus /></Campo>
      <Campo etiqueta="¿Cuánto? (S/)"><input value={monto} onChange={(e) => setMonto(e.target.value)} inputMode="decimal" placeholder="0.00" className={claseInput} /></Campo>
      <fieldset>
        <legend className="mb-1.5 text-[17px] font-semibold">Categoría</legend>
        <div className="grid grid-cols-2 gap-2">
          {categorias.map((c) => (
            <button key={c.id} type="button" aria-pressed={categoria === c.id} onClick={() => setCategoria(c.id)}
              className={cn("flex min-h-[56px] items-center gap-2 rounded-2xl border-2 px-2 text-left text-[16px] font-semibold leading-tight", categoria === c.id ? "border-caja bg-[#EAF2FC]" : "border-caja-borde bg-white")}>
              <IconoCategoria c={c} tam={34} />{c.nombre}
            </button>
          ))}
          <button type="button" onClick={onNuevaEtiqueta} className="flex min-h-[56px] items-center gap-2 rounded-2xl border-2 border-dashed border-caja-borde px-2 text-[16px] font-semibold text-caja"><IcMas tam={22} />Crear etiqueta</button>
        </div>
      </fieldset>
      <Campo etiqueta="¿Cuándo?"><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={claseInput} /></Campo>
      <div><p className="mb-1.5 text-[17px] font-semibold">¿Se repite cada mes?</p><Opciones etiqueta="Tipo de gasto" valor={tipo} onChange={setTipo} opciones={[["variable", "No, fue esta vez"], ["fijo", "Sí, es fijo"]]} /></div>
      <div><p className="mb-1.5 text-[17px] font-semibold">¿Es de su casa o de su negocio?</p><Opciones etiqueta="Gasto personal o del negocio" valor={ambito} onChange={setAmbito} opciones={[["personal", "De mi casa"], ["negocio", "Del negocio"]]} /></div>
      <MensajeError texto={error} />
      <Guardar cargando={cargando} />
    </form>
  );
}

function FormIngreso({ ingreso, onGuardar }: { ingreso?: Ingreso; onGuardar: (d: Record<string, unknown>) => Promise<void> }) {
  const [nombre, setNombre] = useState(ingreso?.nombre ?? "");
  const [monto, setMonto] = useState(ingreso ? String(ingreso.monto) : "");
  const [frecuencia, setFrecuencia] = useState<(typeof FRECUENCIAS)[number][0]>(ingreso?.frecuencia ?? "mensual");
  const { error, cargando, enviar } = usarEnvio(onGuardar);
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); enviar({ id: ingreso?.id, nombre, monto, frecuencia }); }}>
      <Campo etiqueta="¿De dónde viene?"><input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej.: Sueldo, Ventas del negocio" maxLength={40} className={claseInput} autoFocus /></Campo>
      <Campo etiqueta="¿Cuánto recibe? (S/)"><input value={monto} onChange={(e) => setMonto(e.target.value)} inputMode="decimal" placeholder="0.00" className={claseInput} /></Campo>
      <div><p className="mb-1.5 text-[17px] font-semibold">¿Cada cuánto?</p><Opciones etiqueta="Frecuencia" valor={frecuencia} onChange={setFrecuencia} opciones={FRECUENCIAS} /></div>
      <MensajeError texto={error} />
      <Guardar cargando={cargando} />
    </form>
  );
}

function FormEtiqueta({ onGuardar }: { onGuardar: (d: Record<string, unknown>) => Promise<void> }) {
  const [nombre, setNombre] = useState("");
  const [color, setColor] = useState(COLORES_PROPIOS[0]);
  const [icono, setIcono] = useState<(typeof ICONOS_PROPIOS)[number]>(ICONOS_PROPIOS[0]);
  const { error, cargando, enviar } = usarEnvio(onGuardar);
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); enviar({ nombre, color, icono }); }}>
      <Campo etiqueta="Nombre de la etiqueta"><input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej.: Fiesta patronal, Mascotas" maxLength={40} className={claseInput} autoFocus /></Campo>
      <fieldset>
        <legend className="mb-1.5 text-[17px] font-semibold">Color</legend>
        <div className="flex flex-wrap gap-3">
          {COLORES_PROPIOS.map((c) => <button key={c} type="button" onClick={() => setColor(c)} aria-label={`Color ${c}`} aria-pressed={color === c} className={cn("h-12 w-12 rounded-full ring-offset-2", color === c && "ring-4 ring-caja")} style={{ background: c }} />)}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-1.5 text-[17px] font-semibold">Dibujo</legend>
        <div className="flex flex-wrap gap-3">
          {ICONOS_PROPIOS.map((i) => <button key={i} type="button" onClick={() => setIcono(i)} aria-label={`Dibujo ${i}`} aria-pressed={icono === i} className={cn("rounded-[14px] ring-offset-2", icono === i && "ring-4 ring-caja")}><IconoCategoria c={{ icono: i, color }} tam={48} /></button>)}
        </div>
      </fieldset>
      <div className="flex items-center gap-3 rounded-2xl bg-neutral-50 p-3"><IconoCategoria c={{ icono, color }} tam={40} /><span className="text-[18px] font-semibold">{nombre || "Mi etiqueta"}</span></div>
      <MensajeError texto={error} />
      <Guardar cargando={cargando} />
    </form>
  );
}
