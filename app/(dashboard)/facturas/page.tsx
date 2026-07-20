import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { DataTable, Column } from "@/components/DataTable"

type Factura = {
  id: string
  numero: string | null
  fecha: string
  fecha_vencimiento: string | null
  total: number
  estado: string | null
  proveedores: { nombre_fantasia: string } | null
}

const columns: Column<Factura>[] = [
  { key: "numero", label: "Número" },
  { key: "proveedor", label: "Proveedor", render: (f) => f.proveedores?.nombre_fantasia ?? "—" },
  { key: "fecha", label: "Fecha", render: (f) => new Date(f.fecha).toLocaleDateString("es-AR") },
  {
    key: "fecha_vencimiento",
    label: "Vencimiento",
    render: (f) => (f.fecha_vencimiento ? new Date(f.fecha_vencimiento).toLocaleDateString("es-AR") : "—"),
  },
  { key: "total", label: "Total", align: "right", render: (f) => `$${Number(f.total ?? 0).toLocaleString("es-AR")}` },
  { key: "estado", label: "Estado", align: "center", render: (f) => f.estado ?? "—" },
]

export default async function FacturasPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("facturas")
    .select(`id, numero, fecha, fecha_vencimiento, total, estado, proveedores (nombre_fantasia)`)
    .order("fecha", { ascending: false })

  if (error) {
    return <div className="rounded-xl bg-red-50 p-4 text-red-700">Error cargando facturas: {error.message}</div>
  }

  const facturas: Factura[] = (data ?? []).map((f) => ({
    ...f,
    proveedores: Array.isArray(f.proveedores) ? f.proveedores[0] ?? null : f.proveedores,
  }))

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">📄 Facturas</h1>
          <p className="mt-2 text-gray-600">Carga y gestión de facturas</p>
        </div>
        <Link href="/facturas/nuevo" className="rounded bg-black px-4 py-2 text-white hover:opacity-80">
          + Nueva factura
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={facturas}
        onView={(f) => `/facturas/${f.id}`}
      />
    </div>
  )
}