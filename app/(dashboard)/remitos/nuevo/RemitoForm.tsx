'use client'

import { useState, useMemo } from "react"
import { crearRemito } from "./actions"

type Proveedor = { id: string; nombre_fantasia: string }
type Empresa = { id: string; razon_social: string }
type Producto = { id: string; nombre: string; codigo: string | null }

type Linea = {
  producto_id: string
  cantidad: number
  precio_unitario: number
}

export function RemitoForm({
  proveedores,
  empresas,
  productos,
}: {
  proveedores: Proveedor[]
  empresas: Empresa[]
  productos: Producto[]
}) {
  const [lineas, setLineas] = useState<Linea[]>([])

  const agregarLinea = () => {
    setLineas((prev) => [...prev, { producto_id: "", cantidad: 1, precio_unitario: 0 }])
  }

  const quitarLinea = (index: number) => {
    setLineas((prev) => prev.filter((_, i) => i !== index))
  }

  const actualizarLinea = (index: number, campo: keyof Linea, valor: string | number) => {
    setLineas((prev) =>
      prev.map((linea, i) => (i === index ? { ...linea, [campo]: valor } : linea))
    )
  }

  const montoTotal = useMemo(() => {
    return lineas.reduce((acc, linea) => acc + linea.cantidad * linea.precio_unitario, 0)
  }, [lineas])

  return (
    <form action={crearRemito} className="space-y-6">
      <input type="hidden" name="items" value={JSON.stringify(lineas)} />
      <input type="hidden" name="monto_total" value={montoTotal} />

      <div className="grid gap-4 rounded-xl bg-white p-6 shadow md:grid-cols-2">
        <div>
          <label className="block text-sm text-gray-600">Proveedor</label>
          <select name="proveedor_id" required className="mt-1 w-full rounded border p-2">
            <option value="">Seleccionar proveedor</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre_fantasia}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-600">Empresa</label>
          <select name="empresa_id" required className="mt-1 w-full rounded border p-2">
            <option value="">Seleccionar empresa</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.razon_social}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-600">Número de remito</label>
          <input name="numero" className="mt-1 w-full rounded border p-2" />
        </div>

        <div>
          <label className="block text-sm text-gray-600">Fecha</label>
          <input type="date" name="fecha" required className="mt-1 w-full rounded border p-2" />
        </div>

        <div>
          <label className="block text-sm text-gray-600">Fecha de vencimiento</label>
          <input type="date" name="fecha_vencimiento" className="mt-1 w-full rounded border p-2" />
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Productos</h2>
          <button
            type="button"
            onClick={agregarLinea}
            className="rounded bg-gray-200 px-3 py-1 text-sm hover:bg-gray-300"
          >
            + Agregar línea
          </button>
        </div>

        {lineas.length === 0 && (
          <p className="text-sm text-gray-500">Todavía no agregaste ningún producto.</p>
        )}

        {lineas.length > 0 && (
          <div className="mb-2 grid grid-cols-12 gap-2 px-1 text-xs font-medium text-gray-500">
            <span className="col-span-5">Producto</span>
            <span className="col-span-2">Cantidad</span>
            <span className="col-span-3">Precio unitario</span>
            <span className="col-span-1 text-right">Subtotal</span>
            <span className="col-span-1"></span>
          </div>
        )}

        {lineas.map((linea, index) => (
          <div key={index} className="mb-3 grid grid-cols-12 items-center gap-2">
            <select
              value={linea.producto_id}
              onChange={(e) => actualizarLinea(index, "producto_id", e.target.value)}
              className="col-span-5 rounded border p-2"
              required
            >
              <option value="">Producto</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo ? `${p.codigo} — ` : ""}{p.nombre}
                </option>
              ))}
            </select>

            <input
              type="number"
              step="0.01"
              placeholder="Cantidad"
              value={linea.cantidad}
              onChange={(e) => actualizarLinea(index, "cantidad", Number(e.target.value))}
              className="col-span-2 rounded border p-2"
              required
            />

            <input
              type="number"
              step="0.01"
              placeholder="Precio unitario"
              value={linea.precio_unitario}
              onChange={(e) => actualizarLinea(index, "precio_unitario", Number(e.target.value))}
              className="col-span-3 rounded border p-2"
              required
            />

            <span className="col-span-1 text-right text-sm text-gray-600">
              ${(linea.cantidad * linea.precio_unitario).toLocaleString("es-AR")}
            </span>

            <button
              type="button"
              onClick={() => quitarLinea(index)}
              className="col-span-1 text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        ))}

        <div className="mt-6 flex justify-end">
          <div className="w-64 text-sm">
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>${montoTotal.toLocaleString("es-AR")}</span>
            </div>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={lineas.length === 0}
        className="rounded bg-black px-5 py-2 text-white hover:opacity-80 disabled:opacity-40"
      >
        Guardar remito
      </button>
    </form>
  )
}