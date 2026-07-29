"use client"

import { useMemo, useState } from "react"
import { crearPago } from "./actions"

type Comprobante = {
  id: string
  numero: string | null
  proveedor: string
  total: number
  saldo: number
}

type FormaPago = { id: string; nombre: string }

export function PagoForm({
  facturas,
  remitos,
  formasPago,
}: {
  facturas: Comprobante[]
  remitos: Comprobante[]
  formasPago: FormaPago[]
}) {
  const [tipo, setTipo] = useState<"factura" | "remito">("factura")
  const [comprobanteId, setComprobanteId] = useState("")
  const [monto, setMonto] = useState<number>(0)

  const lista = tipo === "factura" ? facturas : remitos
  const comprobante = useMemo(() => lista.find((c) => c.id === comprobanteId), [lista, comprobanteId])

  const seleccionarComprobante = (id: string) => {
    setComprobanteId(id)
    const c = lista.find((x) => x.id === id)
    setMonto(c ? c.saldo : 0)
  }

  const cambiarTipo = (nuevoTipo: "factura" | "remito") => {
    setTipo(nuevoTipo)
    setComprobanteId("")
    setMonto(0)
  }

  return (
    <form action={crearPago} className="max-w-xl space-y-6">
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="comprobante_id" value={comprobanteId} />

      <div className="rounded-xl bg-white p-6 shadow">
        <label className="block text-sm text-gray-600">Tipo de comprobante</label>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => cambiarTipo("factura")}
            className={`rounded px-4 py-2 text-sm ${tipo === "factura" ? "bg-black text-white" : "bg-gray-100"}`}
          >
            📄 Factura
          </button>
          <button
            type="button"
            onClick={() => cambiarTipo("remito")}
            className={`rounded px-4 py-2 text-sm ${tipo === "remito" ? "bg-black text-white" : "bg-gray-100"}`}
          >
            📝 Remito
          </button>
        </div>

        <label className="mt-4 block text-sm text-gray-600">Comprobante pendiente</label>
        <select
          value={comprobanteId}
          onChange={(e) => seleccionarComprobante(e.target.value)}
          required
          className="mt-1 w-full rounded border p-2"
        >
          <option value="">Seleccionar comprobante</option>
          {lista.map((c) => (
            <option key={c.id} value={c.id}>
              {c.numero ?? "s/n"} — {c.proveedor} — saldo ${c.saldo.toLocaleString("es-AR")}
            </option>
          ))}
        </select>

        {lista.length === 0 && (
          <p className="mt-2 text-sm text-gray-500">No hay {tipo === "factura" ? "facturas" : "remitos"} pendientes de pago.</p>
        )}

        {comprobante && (
          <p className="mt-2 text-sm text-gray-500">
            Total: ${comprobante.total.toLocaleString("es-AR")} · Saldo pendiente: $
            {comprobante.saldo.toLocaleString("es-AR")}
          </p>
        )}
      </div>

      <div className="grid gap-4 rounded-xl bg-white p-6 shadow md:grid-cols-2">
        <div>
          <label className="block text-sm text-gray-600">Monto a pagar</label>
          <input
            type="number"
            name="monto"
            step="0.01"
            min="0.01"
            value={monto}
            onChange={(e) => setMonto(Number(e.target.value))}
            required
            className="mt-1 w-full rounded border p-2"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600">Forma de pago</label>
          <select name="forma_pago_id" required className="mt-1 w-full rounded border p-2">
            <option value="">Seleccionar forma de pago</option>
            {formasPago.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-600">Fecha</label>
          <input type="date" name="fecha" required className="mt-1 w-full rounded border p-2" />
        </div>
      </div>

      <button
        type="submit"
        disabled={!comprobanteId || monto <= 0}
        className="rounded bg-black px-5 py-2 text-white hover:opacity-80 disabled:opacity-40"
      >
        Registrar pago
      </button>
    </form>
  )
}
