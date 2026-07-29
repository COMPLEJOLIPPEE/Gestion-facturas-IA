import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { DataTable, Column } from "@/components/DataTable"

type Pago = {
  id: string
  fecha: string
  monto: number
  tipo: "Factura" | "Remito"
  numero: string | null
  proveedor: string
  forma_pago: string
  href: string | null
}

type ComprobanteRef = { numero: string | null; proveedores: { nombre_fantasia: string } | { nombre_fantasia: string }[] | null } | null

function proveedorDe(comprobante: ComprobanteRef) {
  if (!comprobante) return "—"
  const proveedor = Array.isArray(comprobante.proveedores) ? comprobante.proveedores[0] : comprobante.proveedores
  return proveedor?.nombre_fantasia ?? "—"
}

const columns: Column<Pago>[] = [
  { key: "fecha", label: "Fecha", render: (p) => new Date(p.fecha).toLocaleDateString("es-AR") },
  { key: "tipo", label: "Tipo", render: (p) => (p.tipo === "Factura" ? "📄 Factura" : "📝 Remito") },
  { key: "numero", label: "Número", render: (p) => p.numero ?? "—" },
  { key: "proveedor", label: "Proveedor" },
  { key: "forma_pago", label: "Forma de pago" },
  { key: "monto", label: "Monto", align: "right", render: (p) => `$${p.monto.toLocaleString("es-AR")}` },
]

export default async function PagosPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("pagos")
    .select(
      `id, fecha, monto,
       formas_pago (nombre),
       facturas (numero, proveedores (nombre_fantasia)),
       remitos (numero, proveedores (nombre_fantasia))`
    )
    .order("fecha", { ascending: false })

  if (error) {
    return <div className="rounded-xl bg-red-50 p-4 text-red-700">Error cargando pagos: {error.message}</div>
  }

  const pagos: Pago[] = (data ?? []).map((p) => {
    const factura = Array.isArray(p.facturas) ? p.facturas[0] : p.facturas
    const remito = Array.isArray(p.remitos) ? p.remitos[0] : p.remitos
    const formaPago = Array.isArray(p.formas_pago) ? p.formas_pago[0] : p.formas_pago
    const tipo: "Factura" | "Remito" = factura ? "Factura" : "Remito"
    const comprobante = factura ?? remito

    return {
      id: p.id,
      fecha: p.fecha,
      monto: Number(p.monto ?? 0),
      tipo,
      numero: comprobante?.numero ?? null,
      proveedor: proveedorDe(comprobante as ComprobanteRef),
      forma_pago: formaPago?.nombre ?? "—",
      href: null,
    }
  })

  const totalPagado = pagos.reduce((acc, p) => acc + p.monto, 0)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">💰 Pagos</h1>
          <p className="mt-2 text-gray-600">
            Control de pagos · {formatMoney(totalPagado)} registrados
          </p>
        </div>
        <Link href="/pagos/nuevo" className="rounded bg-black px-4 py-2 text-white hover:opacity-80">
          + Registrar pago
        </Link>
      </div>

      {pagos.length === 0 ? (
        <div className="rounded-xl bg-white p-6 text-gray-500 shadow">Todavía no hay pagos registrados.</div>
      ) : (
        <DataTable columns={columns} data={pagos} />
      )}
    </div>
  )
}

function formatMoney(value: number) {
  return `$${value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`
}
