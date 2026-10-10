import Dashboard from "@/components/cliente/Dashboard";

// En producción el id de cliente lo daría la sesión de la app de Caja Piura. En la demo: ?id=  (por defecto 1 = Gengis Guerrero).
export default async function Cliente({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const id = Number((await searchParams).id) || 1;
  return <Dashboard clienteId={id} />;
}
