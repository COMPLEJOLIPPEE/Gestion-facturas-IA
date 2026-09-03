"use client"

import { useMemo, useState } from "react"
import { crearPago } from "./actions"

type Comprobante = {
  id: string
  numero: string | null
  codigo_interno?: number
  proveedor: string
  total: number
  saldo: number
}

type FormaPago = { id: string; nombre: string }

const formatoCodigoRemito = (codigo: number) => `R-${String(codigo).padStart(4, "0")}`

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
  const [busqueda, setBusqueda] = useState("")

  const lista = tipo === "factura" ? facturas : remitos
  const comprobantesVisibles = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    if (!termino) return lista

    return lista.filter((c) => {
      const numero = (c.numero ?? "s/n").toLowerCase()
      const proveedor = c.proveedor.toLowerCase()
      const codigo = c.codigo_interno ? formatoCodigoRemito(c.codigo_interno).toLowerCase() : ""
      return numero.includes(termino) || proveedor.includes(termino) || codigo.includes(termino)
    })
  }, [busqueda, lista])

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
    setBusqueda("")
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

        <label className="mt-4 block text-sm text-gray-600">Buscar proveedor, factura o remito</label>
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder={tipo === "factura" ? "Proveedor o número de factura..." : "Proveedor, número o código R-0001..."}
          className="mt-1 w-full rounded border p-2"
        />

        <label className="mt-4 block text-sm text-gray-600">Comprobante pendiente</label>
        <select
          value={comprobanteId}
          onChange={(e) => seleccionarComprobante(e.target.value)}
          required
          className="mt-1 w-full rounded border p-2"
        >
          <option value="">Seleccionar comprobante</option>
          {comprobantesVisibles.map((c) => (
            <option key={c.id} value={c.id}>
              {tipo === "remito" && c.codigo_interno ? `${formatoCodigoRemito(c.codigo_interno)} · ` : ""}
              {c.numero ?? "s/n"} — {c.proveedor} — saldo ${c.saldo.toLocaleString("es-AR")}
            </option>
          ))}
        </select>

        {lista.length > 0 && comprobantesVisibles.length === 0 && (
          <p className="mt-2 text-sm text-gray-500">No hay comprobantes pendientes que coincidan con la búsqueda.</p>
        )}

        {lista.length === 0 && (
          <p className="mt-2 text-sm text-gray-500">No hay {tipo === "factura" ? "facturas" : "remitos"} con saldo pendiente.</p>
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
            max={comprobante?.saldo}
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
        disabled={!comprobanteId || monto <= 0 || (comprobante ? monto > comprobante.saldo + 0.01 : true)}
        className="rounded bg-black px-5 py-2 text-white hover:opacity-80 disabled:opacity-40"
      >
        Registrar pago
      </button>
    </form>
  )
}
