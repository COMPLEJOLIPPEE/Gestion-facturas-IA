import { createClient } from "@/lib/supabase/server"

type Props = {
  params: Promise<{ id: string }>
}

export default async function ProductoDetalle({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: producto, error } = await supabase
    .from("productos")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !producto) {
    return <div className="rounded-xl bg-red-50 p-4 text-red-700">Producto no encontrado</div>
  }

  return (
    <div>
      <h1 className="text-3xl font-bold">{producto.nombre}</h1>
      <p className="mt-2 text-gray-600">Código: {producto.codigo}</p>
      <div className="mt-6 grid grid-cols-2 gap-4 rounded-xl bg-white p-6 shadow">
        <div><span className="text-gray-500">Unidad:</span> {producto.unidad_medida}</div>
        <div><span className="text-gray-500">IVA:</span> {producto.iva}%</div>
        <div><span className="text-gray-500">Costo actual:</span> ${Number(producto.costo_actual ?? 0).toLocaleString("es-AR")}</div>
        <div><span className="text-gray-500">Precio de venta:</span> ${Number(producto.precio_venta ?? 0).toLocaleString("es-AR")}</div>
        <div><span className="text-gray-500">Estado:</span> {producto.activo ? "✅ Activo" : "❌ Inactivo"}</div>
      </div>
    </div>
  )
}