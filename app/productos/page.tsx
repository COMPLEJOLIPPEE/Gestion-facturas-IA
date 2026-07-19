import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { DataTable, Column } from "@/components/DataTable"

type Producto = {
  id: string
  codigo: string
  nombre: string
  unidad_medida: string
  costo_actual: number
  precio_venta: number
  iva: number
  activo: boolean
  categorias_productos: { nombre: string } | null
}

const columns: Column<Producto>[] = [
  { key: "codigo", label: "Código" },
  { key: "nombre", label: "Producto" },
  { key: "categoria", label: "Categoría", render: (p) => p.categorias_productos?.nombre ?? "—" },
  { key: "unidad_medida", label: "Unidad" },
  { key: "costo_actual", label: "Costo", align: "right", render: (p) => `$${Number(p.costo_actual ?? 0).toLocaleString("es-AR")}` },
  { key: "precio_venta", label: "Venta", align: "right", render: (p) => `$${Number(p.precio_venta ?? 0).toLocaleString("es-AR")}` },
  { key: "iva", label: "IVA", align: "center", render: (p) => `${p.iva}%` },
  { key: "activo", label: "Estado", align: "center", render: (p) => (p.activo ? "✅ Activo" : "❌ Inactivo") },
]

export default async function ProductosPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("productos")
    .select(`id, codigo, nombre, unidad_medida, costo_actual, precio_venta, iva, activo, categorias_productos!inner (nombre)`)
    .order("nombre")

  if (error) {
    return <div className="rounded-xl bg-red-50 p-4 text-red-700">Error cargando productos: {error.message}</div>
  }

  const productos: Producto[] = (data ?? []).map((p) => ({
    ...p,
    categorias_productos: Array.isArray(p.categorias_productos)
      ? p.categorias_productos[0] ?? null
      : p.categorias_productos,
  }))

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">📦 Productos</h1>
          <p className="mt-2 text-gray-600">Gestión de productos</p>
        </div>
        <Link href="/productos/nuevo" className="rounded bg-black px-4 py-2 text-white hover:opacity-80">
          + Nuevo producto
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={productos}
        onView={(p) => `/productos/${p.id}`}
        onEdit={(p) => `/productos/${p.id}/editar`}
      />
    </div>
  )
}