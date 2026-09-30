import { probarRemitoAction } from "./actions"

const variants = [
  { name: "A — sin items", variant: "empty", items: "" },
  { name: "B — items vacío", variant: "empty-array", items: "[]" },
  { name: "C — 1 item", variant: "one-item", items: JSON.stringify([{ producto_id: "test", cantidad: 1, precio_unitario: 100, descuento: 0, bonificacion_importe: 0 }]) },
  { name: "D — 50 items", variant: "many-items", items: JSON.stringify(Array.from({ length: 50 }, (_, i) => ({ producto_id: "test-" + i, cantidad: 1, precio_unitario: 100, descuento: 0, bonificacion_importe: 0 }))) },
]

export default function RemitoActionTestPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8">
      <h1 className="text-2xl font-bold">Prueba técnica — Remito</h1>
      <p className="text-sm text-gray-600">Estas pruebas no crean remitos ni modifican Supabase.</p>
      {variants.map((item) => (
        <form key={item.variant} action={probarRemitoAction} className="rounded-lg border p-4">
          <input type="hidden" name="variant" value={item.variant} />
          <input type="hidden" name="items" value={item.items} />
          <button type="submit" className="rounded-lg bg-black px-4 py-2 text-white">
            Probar {item.name}
          </button>
        </form>
      ))}
    </main>
  )
}
