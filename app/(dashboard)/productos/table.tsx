import Link from "next/link";
import { Search, X } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { Column, DataTable } from "@/components/DataTable";
import { Producto } from "./columns";

type Props = {
  productos: Producto[];
  search: string;
  estado: string;
  categoria: string;
  categorias: { id: string; nombre: string }[];
};

export default function ProductosTable({ productos, search, estado, categoria, categorias }: Props) {
  const filtrosActivos = Boolean(search || estado || categoria);
  const columns: Column<Producto>[] = [
    { key: "codigo", label: "Código", render: (p) => p.codigo?.trim() ? p.codigo : <span className="text-gray-400">—</span> },
    { key: "nombre", label: "Producto" },
    { key: "categoria", label: "Categoría", render: (p) => <Badge variant="secondary">{p.categorias_productos?.nombre ?? "Sin categoría"}</Badge> },
    { key: "unidad_medida", label: "Unidad", render: (p) => p.unidad_medida || <span className="text-gray-400">—</span> },
    { key: "costo_actual", label: "Costo actual", align: "right", render: (p) => `$${Number(p.costo_actual ?? 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { key: "ultimo_costo", label: "Último costo", align: "right", render: (p) => `$${Number(p.ultimo_costo ?? 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { key: "activo", label: "Estado", align: "center", render: (p) => <Badge variant={p.activo ? "success" : "danger"}>{p.activo ? "Activo" : "Inactivo"}</Badge> },
  ];

  return (
    <>
      <form method="get" className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Search className="h-4 w-4" /> Buscar y filtrar productos
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(240px,1.7fr)_repeat(2,minmax(160px,1fr))_auto]">
          <div>
            <label htmlFor="producto-search" className="mb-1 block text-xs font-medium text-gray-600">Buscar</label>
            <input id="producto-search" name="q" defaultValue={search} placeholder="Nombre o código..." className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label htmlFor="producto-estado" className="mb-1 block text-xs font-medium text-gray-600">Estado</label>
            <select id="producto-estado" name="estado" defaultValue={estado} className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm">
              <option value="">Todos</option><option value="activo">Activo</option><option value="inactivo">Inactivo</option>
            </select>
          </div>
          <div>
            <label htmlFor="producto-categoria" className="mb-1 block text-xs font-medium text-gray-600">Categoría</label>
            <select id="producto-categoria" name="categoria" defaultValue={categoria} className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm">
              <option value="">Todas</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit">Filtrar</Button>
            {filtrosActivos && <Link href="/productos" aria-label="Limpiar filtros" title="Limpiar filtros" className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 px-3 text-gray-600 hover:bg-gray-50"><X className="h-4 w-4" /></Link>}
          </div>
        </div>
      </form>
      <div className="mb-3 text-sm text-gray-500">Mostrando <strong className="text-gray-700">{productos.length}</strong> producto{productos.length === 1 ? "" : "s"}{filtrosActivos ? " con los filtros aplicados" : ""}.</div>
      <DataTable columns={columns} data={productos} onView={(p) => `/productos/${p.id}`} onEdit={(p) => `/productos/${p.id}/editar`} />
    </>
  );
}