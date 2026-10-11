"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { APP_NOMBRE } from "@/lib/config";
import { api } from "@/lib/cliente-api";

export default function LoginBanco() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("gestor");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  return (
    <main className="max-w-sm mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold text-caja">{APP_NOMBRE} · Gestor</h1>
      <form className="card space-y-3" onSubmit={async (e) => { e.preventDefault(); try { await api("/api/banco/login", { usuario, clave }); router.push("/banco"); router.refresh(); } catch (x: any) { setError(x.message); } }}>
        <label className="block text-sm font-semibold">Usuario<input value={usuario} onChange={(e) => setUsuario(e.target.value)} className="mt-1 w-full min-h-[48px] rounded-xl border border-caja-borde px-3 font-normal" /></label>
        <label className="block text-sm font-semibold">Clave<input type="password" value={clave} onChange={(e) => setClave(e.target.value)} className="mt-1 w-full min-h-[48px] rounded-xl border border-caja-borde px-3 font-normal" /></label>
        {error && <p className="text-red-700 text-sm">{error}</p>}
        <button className="btn w-full">Ingresar</button>
        <p className="text-xs text-gray-500">Ingrese con su usuario y clave de gestor de Caja Piura.</p>
      </form>
    </main>
  );
}
