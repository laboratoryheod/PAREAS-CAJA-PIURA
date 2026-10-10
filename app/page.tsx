import Link from "next/link";
import { APP_NOMBRE, APP_ENTIDAD } from "@/lib/config";

export default function Landing() {
  return (
    <main className="max-w-md mx-auto p-6 space-y-6">
      <header className="bg-caja-header text-white rounded-tarjeta p-6">
        <p className="text-sm opacity-80">{APP_ENTIDAD}</p>
        <h1 className="text-3xl font-bold">{APP_NOMBRE}</h1>
        <p className="mt-2">Sepa cuánto debe, arme su plan de pago y póngase al día a su ritmo.</p>
      </header>
      <Link href="/cliente" className="btn w-full">Entrar como cliente</Link>
      <Link href="/banco" className="btn btn-acento w-full">Entrar como banco</Link>
    </main>
  );
}
