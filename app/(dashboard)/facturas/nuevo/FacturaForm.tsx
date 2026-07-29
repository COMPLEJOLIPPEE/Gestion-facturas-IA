'use client'

import { useState, useMemo, useRef } from "react"
import { crearFactura } from "./actions"
import { leerFacturaConIA } from "@/lib/ai/actions"
import { matchearProducto } from "@/lib/ai/matchear-producto"

type Proveedor = { id: string; nombre_fantasia: string }
type Empresa = { id: string; razon_social: string }
type Producto = { id: string; nombre: string; codigo: string | null; iva: number | null }

type Linea = {
  producto_id: string
  cantidad: number
  precio_unitario: number
  iva: number
  descripcionLeida?: string
  autoMatcheado?: boolean
}

type FormaPago = { id: string; nombre: string }

export function FacturaForm({
  proveedores,
  empresas,
  productos,
  formasPago,
}: {
  proveedores: Proveedor[]
  empresas: Empresa[]
  productos: Producto[]
  formasPago: FormaPago[]
}) {
  const [lineas, setLineas] = useState<Linea[]>([])
  const [pagarAlCargar, setPagarAlCargar] = useState(false)
  const [montoPago, setMontoPago] = useState<number>(0)
  const [pagoTocado, setPagoTocado] = useState(false)

  const [proveedorId, setProveedorId] = useState("")
  const [numero, setNumero] = useState("")
  const [fecha, setFecha] = useState("")
  const [fechaVencimiento, setFechaVencimiento] = useState("")

  const [leyendoIA, setLeyendoIA] = useState(false)
  const [errorIA, setErrorIA] = useState<string | null>(null)
  const inputArchivoRef = useRef<HTMLInputElement>(null)

  const agregarLinea = () => {
    setLineas((prev) => [...prev, { producto_id: "", cantidad: 1, precio_unitario: 0, iva: 21 }])
  }

  const quitarLinea = (index: number) => {
    setLineas((prev) => prev.filter((_, i) => i !== index))
  }

  const actualizarLinea = (index: number, campo: keyof Linea, valor: string | number) => {
    setLineas((prev) =>
      prev.map((linea, i) => (i === index ? { ...linea, [campo]: valor } : linea))
    )
  }

  const actualizarProductoDeLinea = (index: number, productoId: string) => {
    const producto = productos.find((p) => p.id === productoId)
    setLineas((prev) =>
      prev.map((linea, i) =>
        i === index
          ? { ...linea, producto_id: productoId, iva: producto?.iva ?? linea.iva }
          : linea
      )
    )
  }

  const { subtotal, iva, total } = useMemo(() => {
    let subtotal = 0
    let ivaTotal = 0

    for (const linea of lineas) {
      const importeLinea = linea.cantidad * linea.precio_unitario
      subtotal += importeLinea
      ivaTotal += importeLinea * (linea.iva / 100)
    }

    return { subtotal, iva: ivaTotal, total: subtotal + ivaTotal }
  }, [lineas])

  const montoPagoMostrado = pagoTocado ? montoPago : total

  const archivoABase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const resultado = reader.result as string
        resolve(resultado.split(",")[1] ?? "")
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const manejarArchivoIA = async (file: File) => {
    setLeyendoIA(true)
    setErrorIA(null)
    try {
      const base64 = await archivoABase64(file)
      const datos = await leerFacturaConIA(base64, file.type)

      if (datos.proveedor_nombre) {
        const proveedorMatch = matchearProducto(
          datos.proveedor_nombre,
          proveedores.map((p) => ({ id: p.id, nombre: p.nombre_fantasia }))
        )
        if (proveedorMatch) setProveedorId(proveedorMatch.id)
      }

      if (datos.numero) setNumero(datos.numero)
      if (datos.fecha) setFecha(datos.fecha)
      if (datos.fecha_vencimiento) setFechaVencimiento(datos.fecha_vencimiento)

      if (datos.lineas.length > 0) {
        setLineas(
          datos.lineas.map((l) => {
            const match = matchearProducto(l.descripcion, productos)
            return {
              producto_id: match?.id ?? "",
              cantidad: l.cantidad || 1,
              precio_unitario: l.precio_unitario || 0,
              iva: l.iva ?? match?.iva ?? 21,
              descripcionLeida: l.descripcion,
              autoMatcheado: Boolean(match),
            }
          })
        )
      }
    } catch (err) {
      setErrorIA(err instanceof Error ? err.message : "No se pudo leer el comprobante")
    } finally {
      setLeyendoIA(false)
      if (inputArchivoRef.current) inputArchivoRef.current.value = ""
    }
  }

  return (
    <form action={crearFactura} className="space-y-6">
      <input type="hidden" name="items" value={JSON.stringify(lineas)} />
      <input type="hidden" name="subtotal" value={subtotal} />
      <input type="hidden" name="iva" value={iva} />
      <input type="hidden" name="total" value={total} />

      <div className="rounded-xl bg-white p-6 shadow">
        <label className="block text-sm font-medium">✨ Cargar con IA</label>
        <p className="mt-1 text-xs text-gray-500">
          Subí una foto o el PDF de la factura y se autocompletan los datos abajo para que los revises.
        </p>
        <input
          ref={inputArchivoRef}
          type="file"
          accept="application/pdf,image/*"
          disabled={leyendoIA}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) manejarArchivoIA(file)
          }}
          className="mt-3 text-sm"
        />
        {leyendoIA && <p className="mt-2 text-sm text-gray-500">Leyendo comprobante…</p>}
        {errorIA && <p className="mt-2 text-sm text-red-600">{errorIA}</p>}
      </div>

      <div className="grid gap-4 rounded-xl bg-white p-6 shadow md:grid-cols-2">
        <div>
          <label className="block text-sm text-gray-600">Proveedor</label>
          <select
            name="proveedor_id"
            value={proveedorId}
            onChange={(e) => setProveedorId(e.target.value)}
            required
            className="mt-1 w-full rounded border p-2"
          >
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
          <label className="block text-sm text-gray-600">Número de factura</label>
          <input
            name="numero"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            className="mt-1 w-full rounded border p-2"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600">Fecha</label>
          <input
            type="date"
            name="fecha"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            required
            className="mt-1 w-full rounded border p-2"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600">Fecha de vencimiento</label>
          <input
            type="date"
            name="fecha_vencimiento"
            value={fechaVencimiento}
            onChange={(e) => setFechaVencimiento(e.target.value)}
            className="mt-1 w-full rounded border p-2"
          />
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
            <span className="col-span-4">Producto</span>
            <span className="col-span-2">Cantidad</span>
            <span className="col-span-2">Precio unitario</span>
            <span className="col-span-2">IVA</span>
            <span className="col-span-1 text-right">Subtotal</span>
            <span className="col-span-1"></span>
          </div>
        )}

        {lineas.map((linea, index) => (
          <div key={index} className="mb-3 grid grid-cols-12 items-center gap-2">
            <div className="col-span-4">
              <select
                value={linea.producto_id}
                onChange={(e) => actualizarProductoDeLinea(index, e.target.value)}
                className="w-full rounded border p-2"
                required
              >
                <option value="">Producto</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.codigo ? `${p.codigo} — ` : ""}{p.nombre}
                  </option>
                ))}
              </select>
              {linea.descripcionLeida && (
                <p className="mt-1 text-xs">
                  {linea.autoMatcheado ? (
                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-700">
                      ✓ coincidencia automática — &ldquo;{linea.descripcionLeida}&rdquo;
                    </span>
                  ) : (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700">
                      sin coincidencia — &ldquo;{linea.descripcionLeida}&rdquo;, elegí el producto
                    </span>
                  )}
                </p>
              )}
            </div>

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
              className="col-span-2 rounded border p-2"
              required
            />

            <select
              value={linea.iva}
              onChange={(e) => actualizarLinea(index, "iva", Number(e.target.value))}
              className="col-span-2 rounded border p-2"
            >
              <option value={21}>21%</option>
              <option value={10.5}>10,5%</option>
              <option value={0}>0%</option>
            </select>

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
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span>${subtotal.toLocaleString("es-AR")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">IVA</span>
              <span>${iva.toLocaleString("es-AR")}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>${total.toLocaleString("es-AR")}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={pagarAlCargar}
            onChange={(e) => setPagarAlCargar(e.target.checked)}
          />
          Marcar como pagado al cargar
        </label>

        {pagarAlCargar && (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm text-gray-600">Monto pagado</label>
              <input
                type="number"
                name="pago_monto"
                step="0.01"
                min="0.01"
                value={montoPagoMostrado}
                onChange={(e) => {
                  setPagoTocado(true)
                  setMontoPago(Number(e.target.value))
                }}
                required={pagarAlCargar}
                className="mt-1 w-full rounded border p-2"
              />
              <p className="mt-1 text-xs text-gray-400">Total de la factura: ${total.toLocaleString("es-AR")}</p>
            </div>

            <div>
              <label className="block text-sm text-gray-600">Forma de pago</label>
              <select name="pago_forma_pago_id" required={pagarAlCargar} className="mt-1 w-full rounded border p-2">
                <option value="">Seleccionar forma de pago</option>
                {formasPago.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-600">Fecha de pago</label>
              <input type="date" name="pago_fecha" required={pagarAlCargar} className="mt-1 w-full rounded border p-2" />
            </div>
          </div>
        )}
      </div>

      <input type="hidden" name="pagar_al_cargar" value={pagarAlCargar ? "1" : ""} />

      <button
        type="submit"
        disabled={lineas.length === 0}
        className="rounded bg-black px-5 py-2 text-white hover:opacity-80 disabled:opacity-40"
      >
        Guardar factura
      </button>
    </form>
  )
}