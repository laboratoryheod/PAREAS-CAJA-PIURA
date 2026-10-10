import Dashboard, { type Vista } from "@/components/cliente/Dashboard";

const VISTAS: Vista[] = ["inicio", "pagar", "trivia", "asistente", "simulador", "plan"];

// En producción el id de cliente lo daría la sesión de la app de Caja Piura. En la demo: ?id=  (por defecto 1 = Gengis Guerrero).
export default async function Cliente({ searchParams }: { searchParams: Promise<{ id?: string; ver?: string }> }) {
  const q = await searchParams;
  const id = Number(q.id) || 1;
  const ver = VISTAS.includes(q.ver as Vista) ? (q.ver as Vista) : "inicio";
  return <Dashboard clienteId={id} vistaInicial={ver} />;
}
