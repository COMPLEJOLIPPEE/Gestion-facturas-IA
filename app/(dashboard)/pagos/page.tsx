import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { DataTable, Column } from "@/components/DataTable"
import { formatDateAR } from "@/lib/utils"

type Pago = {
  id: string
  fecha: string
  monto: number
  tipo: "Factura" | "Remito"
  numero: string | null
  proveedor: string
  forma_pago: string
  tipo_pago: "Pago total" | "Pago parcial" | "Cancelación de saldo" | "—"
  href: string | null
  comprobante_id: string | null
}

type Comprobante = {
  numero: string | null
  total?: number | null
  monto_total?: number | null
  proveedores:
    | { nombre_fantasia: string }
    | { nombre_fantasia: string }[]
    | null
}

type PagoRaw = {
  id: string
  fecha: string
  monto: number
  created_at: string
  formas_pago:
    | { nombre: string }
    | { nombre: string }[]
    | null
  facturas: Comprobante & { id: string } | (Comprobante & { id: string })[] | null
  remitos: Comprobante & { id: string } | (Comprobante & { id: string })[] | null
}

function proveedorDe(comprobante: Comprobante | null) {
  if (!comprobante) return "—"
  const proveedor = Array.isArray(comprobante.proveedores)
    ? comprobante.proveedores[0]
    : comprobante.proveedores
  return proveedor?.nombre_fantasia ?? "—"
}

const columns: Column<Pago>[] = [
  {
    key: "fecha",
    label: "Fecha",
    render: (p) => formatDateAR(p.fecha),
  },
  {
    key: "tipo",
    label: "Tipo",
    render: (p) => (p.tipo === "Factura" ? "📄 Factura" : "📝 Remito"),
  },
  {
    key: "numero",
    label: "Número",
    render: (p) => p.numero ?? "—",
  },
  {
    key: "proveedor",
    label: "Proveedor",
  },
  {
    key: "forma_pago",
    label: "Forma de pago",
  },
  {
    key: "tipo_pago",
    label: "Tipo de pago",
    render: (p) => {
      if (p.tipo_pago === "Pago total") {
        return (
          <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
            🟢 Pago total
          </span>
        )
      }

      if (p.tipo_pago === "Cancelación de saldo") {
        return (
          <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
            🔵 Cancelación de saldo
          </span>
        )
      }

      if (p.tipo_pago === "Pago parcial") {
        return (
          <span className="inline-flex rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
            🟡 Pago parcial
          </span>
        )
      }

      return "—"
    },
  },
  {
    key: "monto",
    label: "Monto",
    align: "right",
    render: (p) => `$${p.monto.toLocaleString("es-AR")}`,
  },
]

export default async function PagosPage({
  searchParams,
}: {
  searchParams: Promise<{ proveedor?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams
  const proveedorFiltro = params.proveedor?.trim() ?? ""

  const { data, error } = await supabase
    .from("pagos")
    .select(
      `id, fecha, monto, created_at,
       formas_pago (nombre),
       facturas (id, numero, total, proveedores (nombre_fantasia)),
       remitos (id, numero, monto_total, proveedores (nombre_fantasia))`
    )
    .order("fecha", { ascending: true })
    .order("created_at", { ascending: true })

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-4 text-red-700">
        Error cargando pagos: {error.message}
      </div>
    )
  }

  const pagosRaw = (data ?? []) as unknown as PagoRaw[]

  const pagosBase = pagosRaw.map((p) => {
    const factura = Array.isArray(p.facturas) ? p.facturas[0] : p.facturas
    const remito = Array.isArray(p.remitos) ? p.remitos[0] : p.remitos
    const formaPago = Array.isArray(p.formas_pago) ? p.formas_pago[0] : p.formas_pago
    const tipo: "Factura" | "Remito" = factura ? "Factura" : "Remito"
    const comprobante = factura ?? remito
    const totalComprobante = Number(
      factura?.total ?? remito?.monto_total ?? 0
    )

    return {
      raw: p,
      id: p.id,
      fecha: p.fecha,
      monto: Number(p.monto ?? 0),
      tipo,
      numero: comprobante?.numero ?? null,
      proveedor: proveedorDe(comprobante),
      forma_pago: formaPago?.nombre ?? "—",
      totalComprobante,
      comprobante_id: comprobante?.id ?? null,
    }
  })

  const acumuladoPorComprobante = new Map<string, number>()

  const pagos: Pago[] = pagosBase.map((p) => {
    if (!p.comprobante_id || p.totalComprobante <= 0) {
      return { ...p, tipo_pago: "—", href: null }
    }

    const anterior = acumuladoPorComprobante.get(p.comprobante_id) ?? 0
    const despues = anterior + p.monto
    let tipo_pago: Pago["tipo_pago"]

    if (anterior === 0 && despues >= p.totalComprobante) {
      tipo_pago = "Pago total"
    } else if (despues >= p.totalComprobante) {
      tipo_pago = "Cancelación de saldo"
    } else {
      tipo_pago = "Pago parcial"
    }

    acumuladoPorComprobante.set(p.comprobante_id, despues)

    return {
      id: p.id,
      fecha: p.fecha,
      monto: p.monto,
      tipo: p.tipo,
      numero: p.numero,
      proveedor: p.proveedor,
      forma_pago: p.forma_pago,
      tipo_pago,
      href: null,
      comprobante_id: p.comprobante_id,
    }
  })

  const pagosFiltrados = proveedorFiltro
    ? pagos.filter((p) =>
        p.proveedor.toLowerCase().includes(proveedorFiltro.toLowerCase())
      )
    : pagos

  const totalPagado = pagosFiltrados.reduce((acc, p) => acc + p.monto, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">💰 Pagos</h1>
          <p className="mt-2 text-gray-600">
            Control de pagos · {formatMoney(totalPagado)} registrados
          </p>
        </div>
        <Link
          href="/pagos/nuevo"
          className="rounded bg-black px-4 py-2 text-white hover:opacity-80"
        >
          + Registrar pago
        </Link>
      </div>

      <form method="GET" className="rounded-xl bg-white p-5 shadow">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium">
              Buscar proveedor
            </label>
            <input
              type="text"
              name="proveedor"
              defaultValue={proveedorFiltro}
              placeholder="Nombre del proveedor..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-black px-5 py-2 text-white hover:bg-gray-800"
          >
            Buscar
          </button>
          <Link
            href="/pagos"
            className="rounded-lg border border-gray-300 px-5 py-2 text-sm hover:bg-gray-100"
          >
            Limpiar
          </Link>
        </div>
      </form>

      {pagosFiltrados.length === 0 ? (
        <div className="rounded-xl bg-white p-6 text-gray-500 shadow">
          No se encontraron pagos para ese proveedor.
        </div>
      ) : (
        <DataTable columns={columns} data={pagosFiltrados.slice().reverse()} />
      )}
    </div>
  )
}

function formatMoney(value: number) {
  return `$${value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`
}
