import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"

type Props = {
  params: Promise<{ id: string }>
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
      fecha_vencimiento,
      monto_total,
      estado,
      proveedores (nombre_fantasia),
      empresas (razon_social)
    `)
    .eq("id", id)
    .single()

  if (error || !remito) {
    notFound()
  }

  const proveedor = Array.isArray(remito.proveedores) ? remito.proveedores[0] : remito.proveedores
  const empresa = Array.isArray(remito.empresas) ? remito.empresas[0] : remito.empresas

  const { data: items } = await supabase
    .from("remito_items")
    .select(`id, cantidad, precio_unitario, productos (nombre, codigo, unidad_medida)`)
    .eq("remito_id", id)

  const itemsNormalizados = (items ?? []).map((item) => ({
    ...item,
    productos: Array.isArray(item.productos) ? item.productos[0] ?? null : item.productos,
  }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">📝 Remito {remito.numero ?? "s/n"}</h1>
        <p className="mt-2 text-gray-600">{proveedor?.nombre_fantasia ?? "Sin proveedor"}</p>
      </div>

      <div className="mb-6 grid gap-4 rounded-xl bg-white p-6 shadow md:grid-cols-4">
        <div>
          <p className="text-sm text-gray-500">Empresa</p>
          <p className="font-medium">{empresa?.razon_social ?? "—"}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Fecha</p>
          <p className="font-medium">{new Date(remito.fecha).toLocaleDateString("es-AR")}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Vencimiento</p>
          <p className="font-medium">
            {remito.fecha_vencimiento ? new Date(remito.fecha_vencimiento).toLocaleDateString("es-AR") : "—"}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Estado</p>
          <p className="font-medium">{remito.estado ?? "—"}</p>
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
          <div className="w-64 text-sm">
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>${Number(remito.monto_total ?? 0).toLocaleString("es-AR")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}