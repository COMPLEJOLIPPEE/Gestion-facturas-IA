"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";

import { Badge } from "@/components/ui";

type Proveedor = {
  id: string;
  nombre_fantasia: string;
  razon_social: string;
  cuit: string;
  condicion_iva: string | null;
  activo: boolean;
  etiqueta_1: string | null;
  etiqueta_2: string | null;
  categoria_id: string | null;
  categoria_nombre: string | null;
};

type Props = {
  proveedores: Proveedor[];
  writable: boolean;
  search: string;
  estado: string;
  condicionIva: string;
  categoria: string;
  categorias: { id: string; nombre: string }[];
};

export default function ProveedoresTable({
  proveedores,
  writable,
  search,
  estado,
  condicionIva,
  categoria,
  categorias,
}: Props) {
  const filtrosActivos = Boolean(search || estado || condicionIva || categoria);

  return (
    <>
      <form method="get" className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Search className="h-4 w-4" />
          Buscar y filtrar proveedores
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(240px,1.7fr)_repeat(3,minmax(150px,1fr))_auto]">
          <div>
            <label htmlFor="proveedor-search" className="mb-1 block text-xs font-medium text-gray-600">
              Buscar
            </label>
            <input
              id="proveedor-search"
              name="q"
              defaultValue={search}
              placeholder="Razón social, nombre, CUIT..."
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="proveedor-estado" className="mb-1 block text-xs font-medium text-gray-600">Estado</label>
            <select id="proveedor-estado" name="estado" defaultValue={estado} className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500">
              <option value="">Todos</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>

          <div>
            <label htmlFor="proveedor-iva" className="mb-1 block text-xs font-medium text-gray-600">Condición IVA</label>
            <select id="proveedor-iva" name="condicion_iva" defaultValue={condicionIva} className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500">
              <option value="">Todas</option>
              <option value="Responsable Inscripto">Responsable Inscripto</option>
              <option value="Monotributista">Monotributista</option>
              <option value="Exento">Exento</option>
              <option value="Consumidor Final">Consumidor Final</option>
            </select>
          </div>

          <div>
            <label htmlFor="proveedor-categoria" className="mb-1 block text-xs font-medium text-gray-600">Categoría</label>
            <select id="proveedor-categoria" name="categoria" defaultValue={categoria} className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500">
              <option value="">Todas</option>
              {categorias.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button type="submit" className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700">Filtrar</button>
            {filtrosActivos && (
              <Link href="/proveedores" aria-label="Limpiar filtros" title="Limpiar filtros" className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 px-3 text-gray-600 hover:bg-gray-50">
                <X className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </form>

      <div className="mb-3 text-sm text-gray-500">
        Mostrando <strong className="text-gray-700">{proveedores.length}</strong> proveedor{proveedores.length === 1 ? "" : "es"}
        {filtrosActivos ? " con los filtros aplicados" : ""}.
      </div>

      <div className="overflow-x-auto overflow-hidden rounded-xl bg-white shadow">
        <table className="w-full min-w-[900px]">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left text-sm">Nombre fantasía</th>
              <th className="p-3 text-left text-sm">Razón social</th>
              <th className="p-3 text-left text-sm">Categoría</th>
              <th className="p-3 text-left text-sm">Etiquetas</th>
              <th className="p-3 text-center text-sm">Estado</th>
              <th className="p-3 text-center text-sm">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {proveedores.length === 0 ? (
              <tr><td colSpan={6} className="p-10 text-center text-sm text-gray-500">No se encontraron proveedores con estos filtros.</td></tr>
            ) : proveedores.map((p) => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
                <td className="p-3 text-sm">{p.nombre_fantasia}</td>
                <td className="p-3 text-sm">{p.razon_social}</td>
                <td className="p-3 text-sm"><Badge variant="secondary">{p.categoria_nombre ?? "Sin categoría"}</Badge></td>
                <td className="p-3 text-sm"><div className="space-y-1">{p.etiqueta_1 && <Badge variant="info">{p.etiqueta_1}</Badge>}{p.etiqueta_2 && <Badge variant="secondary">{p.etiqueta_2}</Badge>}{!p.etiqueta_1 && !p.etiqueta_2 && <span className="text-gray-400">—</span>}</div></td>
                <td className="p-3 text-center"><Badge variant={p.activo ? "success" : "danger"}>{p.activo ? "Activo" : "Inactivo"}</Badge></td>
                <td className="p-3"><div className="flex justify-center gap-2"><Link href={`/proveedores/${p.id}`} className="rounded bg-gray-200 px-3 py-1 text-sm hover:bg-gray-300">👁 Ver</Link>{writable && <Link href={`/proveedores/${p.id}/editar`} className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700">✏️ Editar</Link>}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
