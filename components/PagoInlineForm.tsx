"use client"

import { useState } from "react"

type FormaPago = { id: string; nombre: string }

export function PagoInlineForm({
  saldo,
  formasPago,
  action,
}: {
  saldo: number
  formasPago: FormaPago[]
  action: (formData: FormData) => Promise<void>
}) {
  const [monto, setMonto] = useState(saldo)

  return (
    <form action={action} className="grid gap-3 md:grid-cols-4 md:items-end">
      <div>
        <label className="block text-sm text-gray-600">Monto a pagar</label>
        <input
          type="number"
          name="monto"
          step="0.01"
          min="0.01"
          max={saldo}
          value={monto}
          onChange={(e) => setMonto(Number(e.target.value))}
          required
          className="mt-1 w-full rounded border p-2"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-600">Forma de pago</label>
        <select name="forma_pago_id" required className="mt-1 w-full rounded border p-2">
          <option value="">Seleccionar</option>
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

      <button
        type="submit"
        disabled={monto <= 0 || monto > saldo}
        className="rounded bg-black px-4 py-2 text-sm text-white hover:opacity-80 disabled:opacity-40"
      >
        Registrar pago
      </button>
    </form>
  )
}
