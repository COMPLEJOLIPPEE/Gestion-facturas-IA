import { probarRemitoAction } from "./actions"

const variants = [
  { name: "A — sin items", variant: "empty", items: "" },
  { name: "B — items vacío", variant: "empty-array", items: "[]" },
  { name: "C — 1 item", variant: "one-item", items: JSON.stringify([{ producto_id: "test", cantidad: 1, precio_unitario: 100, descuento: 0, bonificacion_importe: 0 }]) },
  { name: "D — 50 items", variant: "many-items", items: JSON.stringify(Array.from({ length: 50 }, (_, i) => ({ producto_id: "test-" + i, cantidad: 1, precio_unitario: 100, descuento: 0, bonificacion_importe: 0 }))) },
]

export default async function RemitoActionTestPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; variant?: string; count?: string }>
}) {
  const params = await searchParams

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8">
      <h1 className="text-2xl font-bold">Prueba técnica — Remito</h1>
      <p className="text-sm text-gray-600">Estas pruebas no crean remitos ni modifican Supabase.</p>

      {params.ok === "1" && (
        <div className="rounded-lg border border-green-600 bg-green-50 p-4 text-green-900">
          <strong>Server Action ejecutada correctamente.</strong>
          <div>Variante: {params.variant ?? "—"} · Items recibidos: {params.count ?? "0"}</div>
        </div>
      )}

      {variants.map((item) => (
        <form key={item.variant} action={probarRemitoAction} className="rounded-lg border p-4">
          <input type="hidden" name="variant" value={item.variant} />
          <input type="hidden" name="items" value={item.items} />
          <button type="submit" className="rounded-lg bg-black px-4 py-2 text-white">
            Probar {item.name}
          </button>
        </form>
      ))}

      <p className="text-xs text-gray-500">
        Primero probamos A. Si aparece el mensaje verde, la Server Action básica funciona.
      </p>
    </main>
  )
}
