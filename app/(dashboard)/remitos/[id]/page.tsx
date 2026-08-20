import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { PagoInlineForm } from "@/components/PagoInlineForm"
import { formatDateAR } from "@/lib/utils"
import { registrarPagoRemito } from "./actions"

type Props = {
  params: Promise<{ id: string }>
}

type ProductoRelacionado = {
  nombre: string | null
  codigo: string | null
  unidad_medida: string | null
}

type RemitoItem = {
  id: string
  cantidad: number | null
  precio_unitario: number | null
  descuento_importe: number | null
  bonificacion_importe: number | null
  precio_neto_unitario: number | null
  subtotal_neto: number | null
  bonificacion_tipo: string | null
  cantidad_bonificada: number | null
  productos: ProductoRelacionado | ProductoRelacionado[] | null
}

function normalizarProducto(producto: RemitoItem["productos"]): ProductoRelacionado | null {
  return Array.isArray(producto) ? producto[0] ?? null : producto ?? null
}

export default async function RemitoDetallePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: remito, error } = await supabase
    .from("remitos")
    .select(`
      id,
      numero,
      fecha,
      monto_total,
      estado,
      proveedores (nombre_fantasia),
      empresas (razon_social)
    `)
    .eq("id", id)
    .single()

  if (error || !remito) notFound()

  const proveedor = Array.isArray(remito.proveedores) ? remito.proveedores[0] : remito.proveedores
  const empresa = Array.isArray(remito.empresas) ? remito.empresas[0] : remito.empresas

  const { data: items } = await supabase
    .from("remito_items")
    .select(`
      id,
      cantidad,
      precio_unitario,
      descuento_importe,
      bonificacion_importe,
      precio_neto_unitario,
      subtotal_neto,
      bonificacion_tipo,
      cantidad_bonificada,
      productos (nombre, codigo, unidad_medida)
    `)
    .eq("remito_id", id)

  const itemsNormalizados: RemitoItem[] = ((items ?? []) as unknown as RemitoItem[]).map((item) => ({
    id: item.id,
    cantidad: item.cantidad,
    precio_unitario: item.precio_unitario,
    descuento_importe: item.descuento_importe,
    bonificacion_importe: item.bonificacion_importe,
    precio_neto_unitario: item.precio_neto_unitario,
    subtotal_neto: item.subtotal_neto,
    bonificacion_tipo: item.bonificacion_tipo,
    cantidad_bonificada: item.cantidad_bonificada,
    productos: item.productos,
  }))

  const [{ data: pagos }, { data: formasPago }] = await Promise.all([
    supabase
      .from("pagos")
      .select("id, monto, fecha, formas_pago (nombre)")
      .eq("remito_id", id)
      .order("fecha", { ascending: false }),
    supabase.from("formas_pago").select("id, nombre").order("nombre"),
  ])

  const totalPagado = (pagos ?? []).reduce((acc, p) => acc + Number(p.monto ?? 0), 0)
  const saldoPendiente = Math.max(Number(remito.monto_total ?? 0) - totalPagado, 0)
  const registrarPago = registrarPagoRemito.bind(null, remito.id)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">📦 Comprobante de compra</h1>
          <p className="mt-2 text-lg font-medium">{remito.numero ?? "Sin número"}</p>
          <p className="text-gray-600">{proveedor?.nombre_fantasia ?? "Sin proveedor"}</p>
          <p className="text-sm text-gray-500">
            {empresa?.razon_social ?? "Sin empresa"} · {formatDateAR(remito.fecha)}
          </p>
        </div>

        <div className="rounded-lg bg-gray-100 px-4 py-2">
          <p className="text-xs uppercase tracking-wide text-gray-500">Estado</p>
          <p className="font-semibold">
            {saldoPendiente === 0 ? "🟢 Pagado" : totalPagado > 0 ? "🟡 Pago parcial" : "⚪ Pendiente"}
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow">
        <div className="mb-5">
          <h2 className="text-xl font-semibold">📦 Productos</h2>
          <p className="mt-1 text-sm text-gray-500">
            Los remitos no incluyen IVA ni impuestos. Los descuentos y bonificaciones reducen directamente el importe neto de la línea.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b text-left text-sm text-gray-500">
                <th className="pb-3">Código</th>
                <th className="pb-3">Producto</th>
                <th className="pb-3">Unidad</th>
                <th className="pb-3 text-right">Cantidad</th>
                <th className="pb-3 text-right">Precio Unit.</th>
                <th className="pb-3 text-right">Desc. / Bonif.</th>
                <th className="pb-3 text-right">Precio Neto</th>
                <th className="pb-3 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {itemsNormalizados.map((item) => {
                const producto = normalizarProducto(item.productos)
                const bruto = Number(item.cantidad ?? 0) * Number(item.precio_unitario ?? 0)
                const descuento = Number(item.descuento_importe ?? 0)
                const bonificacion = Number(item.bonificacion_importe ?? 0)
                const neto = Number(item.subtotal_neto ?? Math.max(0, bruto - descuento - bonificacion))

                return (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-3">{producto?.codigo ?? "—"}</td>
                    <td className="py-3 font-medium">{producto?.nombre ?? "—"}</td>
                    <td className="py-3">{producto?.unidad_medida ?? "—"}</td>
                    <td className="py-3 text-right">{item.cantidad}</td>
                    <td className="py-3 text-right">${Number(item.precio_unitario ?? 0).toLocaleString("es-AR")}</td>
                    <td className="py-3 text-right">
                      {descuento > 0 && <div className="text-red-600">-${descuento.toLocaleString("es-AR")}</div>}
                      {bonificacion > 0 && <div className="text-blue-600">Bonif. -${bonificacion.toLocaleString("es-AR")}</div>}
                      {item.cantidad_bonificada ? <div className="text-xs text-blue-600">{item.cantidad_bonificada} bonificada(s)</div> : null}
                      {descuento === 0 && bonificacion === 0 && !item.cantidad_bonificada && "—"}
                    </td>
                    <td className="py-3 text-right font-medium">${Number(item.precio_neto_unitario ?? 0).toLocaleString("es-AR")}</td>
                    <td className="py-3 text-right font-semibold">${neto.toLocaleString("es-AR")}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end border-t p-4">
        <div className="w-80 text-sm">
          <div className="flex justify-between">
            <span>Total bruto</span>
            <span>${itemsNormalizados.reduce((sum, item) => sum + Number(item.cantidad ?? 0) * Number(item.precio_unitario ?? 0), 0).toLocaleString("es-AR")}</span>
          </div>
          <div className="flex justify-between text-red-600">
            <span>Descuentos</span>
            <span>-${itemsNormalizados.reduce((sum, item) => sum + Number(item.descuento_importe ?? 0), 0).toLocaleString("es-AR")}</span>
          </div>
          <div className="flex justify-between text-blue-600">
            <span>Bonificaciones</span>
            <span>-${itemsNormalizados.reduce((sum, item) => sum + Number(item.bonificacion_importe ?? 0), 0).toLocaleString("es-AR")}</span>
          </div>
          <div className="mt-2 flex justify-between border-t pt-2 text-base font-bold">
            <span>Total</span>
            <span>${Number(remito.monto_total ?? 0).toLocaleString("es-AR")}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="text-sm text-gray-500">Total del comprobante</p>
          <p className="mt-1 text-xl font-bold">${Number(remito.monto_total ?? 0).toLocaleString("es-AR")}</p>
        </div>
        <div className="rounded-lg bg-green-50 p-4">
          <p className="text-sm text-gray-500">Total pagado</p>
          <p className="mt-1 text-xl font-bold text-green-700">${totalPagado.toLocaleString("es-AR")}</p>
        </div>
        <div className="rounded-lg bg-amber-50 p-4">
          <p className="text-sm text-gray-500">Saldo pendiente</p>
          <p className="mt-1 text-xl font-bold text-amber-700">${saldoPendiente.toLocaleString("es-AR")}</p>
        </div>
      </div>

      <h2 className="mb-4 text-lg font-semibold">Historial de pagos</h2>

      {(pagos ?? []).length > 0 && (
        <table className="mb-4 w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="pb-2">Fecha</th>
              <th className="pb-2">Forma de pago</th>
              <th className="pb-2 text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            {(pagos ?? []).map((p) => {
              const formaPago = Array.isArray(p.formas_pago) ? p.formas_pago[0] : p.formas_pago
              return (
                <tr key={p.id} className="border-t">
                  <td className="py-2">{formatDateAR(p.fecha)}</td>
                  <td className="py-2">{formaPago?.nombre ?? "—"}</td>
                  <td className="py-2 text-right">${Number(p.monto ?? 0).toLocaleString("es-AR")}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {saldoPendiente > 0 ? (
        <PagoInlineForm saldo={saldoPendiente} formasPago={formasPago ?? []} action={registrarPago} />
      ) : (
        <p className="text-sm text-green-600">✅ Remito totalmente pagado.</p>
      )}
    </div>
  )
}
