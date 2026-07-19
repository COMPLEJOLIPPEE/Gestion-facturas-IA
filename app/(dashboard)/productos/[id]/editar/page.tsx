import { createClient } from "@/lib/supabase/server"
import { actualizarProducto } from "./actions"

type Props = {
  params: Promise<{ id: string }>
}

export default async function EditarProducto({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: producto, error } = await supabase
    .from("productos")
    .select("*")
    .eq("id", id)
    .single()

  const { data: categorias } = await supabase
    .from("categorias_productos")
    .select("id, nombre")
    .order("nombre")

  if (error || !producto) {
    return <div className="rounded-xl bg-red-50 p-4 text-red-700">Producto no encontrado</div>
  }

  const actualizarConId = actualizarProducto.bind(null, id)

  return (
    <div>
      <h1 className="text-3xl font-bold">✏️ Editar producto</h1>

      <form action={actualizarConId} className="mt-6 grid max-w-xl gap-4 rounded-xl bg-white p-6 shadow">
        <div>
          <label className="block text-sm text-gray-600">Código</label>
          <input
            name="codigo"
            defaultValue={producto.codigo ?? ""}
            className="mt-1 w-full rounded border p-2"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600">Nombre</label>
          <input
            name="nombre"
            defaultValue={producto.nombre ?? ""}
            required
            className="mt-1 w-full rounded border p-2"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600">Unidad de medida</label>
          <input
            name="unidad_medida"
            defaultValue={producto.unidad_medida ?? ""}
            className="mt-1 w-full rounded border p-2"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600">Categoría</label>
          <select
            name="categoria_id"
            defaultValue={producto.categoria_id ?? ""}
            className="mt-1 w-full rounded border p-2"
          >
            <option value="">Sin categoría</option>
            {categorias?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600">Costo actual</label>
            <input
              type="number"
              step="0.01"
              name="costo_actual"
              defaultValue={producto.costo_actual ?? 0}
              className="mt-1 w-full rounded border p-2"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600">Precio de venta</label>
            <input
              type="number"
              step="0.01"
              name="precio_venta"
              defaultValue={producto.precio_venta ?? 0}
              className="mt-1 w-full rounded border p-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-600">IVA (%)</label>
          <input
            type="number"
            step="0.01"
            name="iva"
            defaultValue={producto.iva ?? 0}
            className="mt-1 w-full rounded border p-2"
          />
        </div>

        <label className="flex items-center gap-2">
          <input type="checkbox" name="activo" defaultChecked={producto.activo} />
          <span className="text-sm text-gray-600">Activo</span>
        </label>

        <button
          type="submit"
          className="mt-2 rounded bg-black px-4 py-2 text-white hover:opacity-80"
        >
          Guardar cambios
        </button>
      </form>
    </div>
  )
}