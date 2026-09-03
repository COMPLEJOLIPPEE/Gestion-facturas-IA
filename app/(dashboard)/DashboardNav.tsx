"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import EmpresaSelector from "./empresa/EmpresaSelector";

const MENU = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/proveedores", label: "Proveedores", icon: "🚚" },
  { href: "/productos", label: "Productos", icon: "📦" },
  { href: "/facturas", label: "Facturas", icon: "📄" },
  { href: "/remitos", label: "Remitos", icon: "📝" },
  { href: "/pagos", label: "Pagos", icon: "💰" },
];

type Empresa = { id: string; razon_social: string };

type Props = {
  empresas: Empresa[];
  empresaActivaId: string | null;
  nombreUsuario: string;
  email?: string;
  rolActual: string;
  logout: () => void;
};

export default function DashboardNav({
  empresas,
  empresaActivaId,
  nombreUsuario,
  email,
  rolActual,
  logout,
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const closeOnDesktop = () => {
      if (window.innerWidth >= 768) setOpen(false);
    };
    window.addEventListener("resize", closeOnDesktop);
    return () => window.removeEventListener("resize", closeOnDesktop);
  }, []);

  const links = rolActual === "superadmin"
    ? [...MENU, { href: "/configuracion", label: "Configuración", icon: "⚙️" }]
    : MENU;

  const menuContent = (
    <>
      <h1 className="mb-6 text-xl font-bold">Gestión Facturas IA</h1>

      <EmpresaSelector empresas={empresas} empresaActivaId={empresaActivaId} />

      <div className="mb-6 rounded-lg bg-gray-50 p-3 text-sm">
        <div className="font-medium">{nombreUsuario}</div>
        <div className="break-all text-xs text-gray-500">{email}</div>
        <div className="mt-1 capitalize text-gray-600">{rolActual}</div>
      </div>

      <nav className="flex flex-col gap-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-lg p-2.5 text-base hover:bg-gray-100"
          >
            <span aria-hidden="true">{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        ))}
      </nav>

      <form action={logout} className="mt-8">
        <button className="w-full rounded-lg bg-black px-4 py-2.5 text-white">
          Cerrar sesión
        </button>
      </form>
    </>
  );

  return (
    <>
      {/* Barra superior exclusiva para celular */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-white px-4 shadow-sm md:hidden">
        <div className="min-w-0">
          <div className="truncate text-base font-bold">Gestión Facturas IA</div>
          <div className="truncate text-xs text-gray-500">{nombreUsuario}</div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={open}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-white text-2xl leading-none"
        >
          ☰
        </button>
      </header>

      {/* Menú lateral de escritorio */}
      <aside className="hidden w-64 shrink-0 bg-white p-6 shadow md:block">
        {menuContent}
      </aside>

      {/* Menú lateral desplegable de celular */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <aside className="relative flex h-full w-[min(86vw,320px)] flex-col overflow-y-auto bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-lg font-bold">Menú</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
                className="flex h-9 w-9 items-center justify-center rounded-lg border text-xl"
              >
                ×
              </button>
            </div>
            {menuContent}
          </aside>
        </div>
      )}
    </>
  );
}
