import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"

type Props = {
  params: Promise<{ id: string }>
}

export default async function FacturaDetallePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: factura, error } = await supabase
    .from("facturas")
    .select(`
      id,
      numero,
      fecha,
      fecha_vencimiento,
      subtotal,
      iva,
      total,
      estado,
      proveedores (nombre_fantasia),
      empresas (razon_social)
    `)
    .eq("id", id)
    .single()

  if (error || !factura) {
    notFound()
  }

  const proveedor = Array.isArray(factura.proveedores) ? factura.proveedores[0] : factura.proveedores
  const empresa = Array.isArray(factura.empresas) ? factura.empresas[0] : factura.empresas

  const { data: items } = await supabase
    .from("factura_items")
    .select(`id, cantidad, precio_unitario, productos (nombre, codigo, unidad_medida)`)
    .eq("factura_id", id)

  const itemsNormalizados = (items ?? []).map((item) => ({
    ...item,
    productos: Array.isArray(item.productos) ? item.productos[0] ?? null : item.productos,
  }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">📄 Factura {factura.numero ?? "s/n"}</h1>
        <p className="mt-2 text-gray-600">{proveedor?.nombre_fantasia ?? "Sin proveedor"}</p>
      </div>

      <div className="mb-6 grid gap-4 rounded-xl bg-white p-6 shadow md:grid-cols-4">
        <div>
          <p className="text-sm text-gray-500">Empresa</p>
          <p className="font-medium">{empresa?.razon_social ?? "—"}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Fecha</p>
          <p className="font-medium">{new Date(factura.fecha).toLocaleDateString("es-AR")}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Vencimiento</p>
          <p className="font-medium">
            {factura.fecha_vencimiento ? new Date(factura.fecha_vencimiento).toLocaleDateString("es-AR") : "—"}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Estado</p>
          <p className="font-medium">{factura.estado ?? "—"}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Código</th>
              <th className="p-3 text-left">Producto</th>
              <th className="p-3 text-left">Unidad</th>
              <th className="p-3 text-right">Cantidad</th>
              <th className="p-3 text-right">Precio unitario</th>
              <th className="p-3 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {itemsNormalizados.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-3">{item.productos?.codigo ?? "—"}</td>
                <td className="p-3 font-medium">{item.productos?.nombre ?? "—"}</td>
                <td className="p-3">{item.productos?.unidad_medida ?? "—"}</td>
                <td className="p-3 text-right">{item.cantidad}</td>
                <td className="p-3 text-right">
                  ${Number(item.precio_unitario ?? 0).toLocaleString("es-AR")}
                </td>
                <td className="p-3 text-right">
                  ${(Number(item.cantidad ?? 0) * Number(item.precio_unitario ?? 0)).toLocaleString("es-AR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end border-t p-4">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span>${Number(factura.subtotal ?? 0).toLocaleString("es-AR")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">IVA</span>
              <span>${Number(factura.iva ?? 0).toLocaleString("es-AR")}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>${Number(factura.total ?? 0).toLocaleString("es-AR")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}