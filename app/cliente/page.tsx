import Dashboard, { type Vista } from "@/components/cliente/Dashboard";
import { registrarEventoCliente, situacion, triviaSiguiente } from "@/lib/servicio";
import Link from "next/link";

export const dynamic = "force-dynamic";

const VISTAS: Vista[] = ["inicio", "pagar", "finanzas", "trivia", "asistente"];

// El id de cliente lo entrega la sesión de la app de Caja Piura (aquí: ?id=, por defecto 1 = Gengis Guerrero).
// La situación inicial se calcula aquí, en el servidor, y viaja con el HTML: sin spinner ni salto de diseño al cargar.
export default async function Cliente({ searchParams }: { searchParams: Promise<{ id?: string; ver?: string }> }) {
  const q = await searchParams;
  const id = Number(q.id) || 1;
  const ver = VISTAS.includes(q.ver as Vista) ? (q.ver as Vista) : "inicio";
  try {
    registrarEventoCliente(id, "modulo_abierto");
    const sit = situacion(id);
    const { progreso } = triviaSiguiente(id);
    return <Dashboard clienteId={id} vistaInicial={ver} inicial={{ sit, progreso }} />;
  } catch {
    return (
      <main className="mx-auto max-w-md p-6">
        <p className="card text-red-700">No encontramos a este cliente.</p>
        <Link href="/" className="text-caja underline">Volver al inicio</Link>
      </main>
    );
  }
}
