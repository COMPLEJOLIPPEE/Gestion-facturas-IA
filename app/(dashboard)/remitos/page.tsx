import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { DataTable, Column } from "@/components/DataTable"

type Remito = {
  id: string
  numero: string | null
  fecha: string
  fecha_vencimiento: string | null
  monto_total: number
  estado: string | null
  proveedores: { nombre_fantasia: string } | null
}

const columns: Column<Remito>[] = [
  { key: "numero", label: "Número" },
  { key: "proveedor", label: "Proveedor", render: (r) => r.proveedores?.nombre_fantasia ?? "—" },
  { key: "fecha", label: "Fecha", render: (r) => new Date(r.fecha).toLocaleDateString("es-AR") },
  {
    key: "fecha_vencimiento",
    label: "Vencimiento",
    render: (r) => (r.fecha_vencimiento ? new Date(r.fecha_vencimiento).toLocaleDateString("es-AR") : "—"),
  },
  { key: "monto_total", label: "Monto", align: "right", render: (r) => `$${Number(r.monto_total ?? 0).toLocaleString("es-AR")}` },
  { key: "estado", label: "Estado", align: "center", render: (r) => r.estado ?? "—" },
]

export default async function RemitosPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("remitos")
    .select(`id, numero, fecha, fecha_vencimiento, monto_total, estado, proveedores (nombre_fantasia)`)
    .order("fecha", { ascending: false })

  if (error) {
    return <div className="rounded-xl bg-red-50 p-4 text-red-700">Error cargando remitos: {error.message}</div>
  }

  const remitos: Remito[] = (data ?? []).map((r) => ({
    ...r,
    proveedores: Array.isArray(r.proveedores) ? r.proveedores[0] ?? null : r.proveedores,
  }))

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">📝 Remitos</h1>
          <p className="mt-2 text-gray-600">Gestión de remitos</p>
        </div>
        <Link href="/remitos/nuevo" className="rounded bg-black px-4 py-2 text-white hover:opacity-80">
          + Nuevo remito
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={remitos}
        onView={(r) => `/remitos/${r.id}`}
      />
    </div>
    )
  }