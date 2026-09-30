import { probarRemitoAction } from "./actions"

const items = JSON.stringify([
  { producto_id: "test", cantidad: 2, precio_unitario: 1000, descuento: 5, bonificacion_importe: 50 },
])

const tests = [
  ["parse", "1. Parsear items"],
  ["process", "2. Procesar items"],
  ["total", "3. Calcular total"],
  ["auth", "4. Crear cliente + autenticar usuario"],
  ["empresa", "5. Resolver empresa activa"],
  ["acceso", "6. Verificar acceso a empresa"],
] as const

export default async function RemitoActionTestPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; stage?: string; detail?: string }>
}) {
  const params = await searchParams

  return (
    <main className="mx-auto max-w-2xl space-y-5 p-8">
      <h1 className="text-2xl font-bold">Diagnóstico — crearRemito</h1>
      <p className="text-sm text-gray-600">
        Prueba controlada. No inserta ni elimina datos de Supabase.
      </p>
      {params.ok === "1" && (
        <div className="rounded-lg border border-green-600 bg-green-50 p-4 text-green-900">
          <strong>Etapa ejecutada correctamente.</strong>
          <div>{params.stage}: {params.detail}</div>
        </div>
      )}
      <div className="space-y-3">
        {tests.map(([stage, label]) => (
          <form key={stage} action={probarRemitoAction} className="rounded-lg border p-4">
            <input type="hidden" name="stage" value={stage} />
            <input type="hidden" name="items" value={items} />
            <button type="submit" className="rounded-lg bg-black px-4 py-2 text-white">
              {label}
            </button>
          </form>
        ))}
      </div>
      <p className="text-xs text-gray-500">
        Si todas pasan, el siguiente paso será probar únicamente el insert de remito.
      </p>
    </main>
  )
}
