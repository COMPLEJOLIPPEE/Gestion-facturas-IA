import { createClient } from "@/lib/supabase/server"
import Link from "next/link"

export default async function ProductosPage() {
  const supabase = await createClient()

  const { data: productos, error } = await supabase
    .from("productos")
    .select(`
      id,
      codigo,
      nombre,
      unidad_medida,
      costo_actual,
      precio_venta,
      iva,
      activo,
      categorias_productos (
        nombre
      )
    `)
    .order("nombre")

  if (error) {
    console.log("Error cargando productos:", error)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            📦 Productos
          </h1>

          <p className="mt-2 text-gray-600">
            Gestión de productos
          </p>
        </div>

        <Link
          href="/productos/nuevo"
          className="rounded bg-black px-4 py-2 text-white hover:opacity-80"
        >
          + Nuevo producto
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow">
        <table className="w-full">

          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Código</th>
              <th className="p-3 text-left">Producto</th>
              <th className="p-3 text-left">Categoría</th>
              <th className="p-3 text-left">Unidad</th>
              <th className="p-3 text-right">Costo</th>
              <th className="p-3 text-right">Venta</th>
              <th className="p-3 text-center">IVA</th>
              <th className="p-3 text-center">Estado</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>

          <tbody>

            {productos?.map((producto) => (

              <tr
                key={producto.id}
                className="border-t"
              >

                <td className="p-3">
                  {producto.codigo}
                </td>

                <td className="p-3 font-medium">
                  {producto.nombre}
                </td>

                <td className="p-3">
                  {producto.categorias_productos?.[0]?.nombre}
                </td>

                <td className="p-3">
                  {producto.unidad_medida}
                </td>

                <td className="p-3 text-right">
                  ${Number(producto.costo_actual ?? 0).toLocaleString("es-AR")}
                </td>

                <td className="p-3 text-right">
                  ${Number(producto.precio_venta ?? 0).toLocaleString("es-AR")}
                </td>

                <td className="p-3 text-center">
                  {producto.iva}%
                </td>

                <td className="p-3 text-center">
                  {producto.activo ? "✅ Activo" : "❌ Inactivo"}
                </td>

                <td className="p-3">
                  <div className="flex justify-center gap-2">

                    <Link
                      href={`/productos/${producto.id}`}
                      className="rounded bg-gray-200 px-3 py-1 text-sm hover:bg-gray-300"
                    >
                      👁 Ver
                    </Link>

                    <Link
                      href={`/productos/${producto.id}/editar`}
                      className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:opacity-80"
                    >
                      ✏️ Editar
                    </Link>

                  </div>
                </td>

              </tr>

            ))}

          </tbody>

        </table>
      </div>
    </div>
  )
}
