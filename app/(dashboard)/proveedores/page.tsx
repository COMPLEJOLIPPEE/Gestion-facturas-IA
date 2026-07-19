import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { DataTable, Column } from "@/components/DataTable"

type Proveedor = {
  id: string
  nombre_fantasia: string
  razon_social: string
  cuit: string
  activo: boolean
  etiqueta_1: string | null
  etiqueta_2: string | null
  categorias_proveedor: { nombre: string } | null
}

const columns: Column<Proveedor>[] = [
  { key: "nombre_fantasia", label: "Nombre fantasía" },
  { key: "razon_social", label: "Razón social" },
  { key: "categoria", label: "Categoría", render: (p) => p.categorias_proveedor?.nombre ?? "—" },
  {
    key: "etiquetas",
    label: "Etiquetas",
    render: (p) => (
      <>
        {p.etiqueta_1}
        {p.etiqueta_1 && p.etiqueta_2 && <br />}
        {p.etiqueta_2}
      </>
    ),
  },
  { key: "activo", label: "Estado", align: "center", render: (p) => (p.activo ? "✅ Activo" : "❌ Inactivo") },
]

export default async function ProveedoresPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("proveedores")
    .select(`id, nombre_fantasia, razon_social, cuit, activo, etiqueta_1, etiqueta_2, categorias_proveedor!inner (nombre)`)
    .order("nombre_fantasia")

  if (error) {
    return <div className="rounded-xl bg-red-50 p-4 text-red-700">Error cargando proveedores: {error.message}</div>
  }

  const proveedores: Proveedor[] = (data ?? []).map((p) => ({
    ...p,
    categorias_proveedor: Array.isArray(p.categorias_proveedor)
      ? p.categorias_proveedor[0] ?? null
      : p.categorias_proveedor,
  }))

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🚚 Proveedores</h1>
          <p className="mt-2 text-gray-600">Gestión de proveedores</p>
        </div>
        <Link href="/proveedores/nuevo" className="rounded bg-black px-4 py-2 text-white hover:opacity-80">
          + Nuevo proveedor
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={proveedores}
        onView={(p) => `/proveedores/${p.id}`}
        onEdit={(p) => `/proveedores/${p.id}/editar`}
      />
    </div>
  )
}