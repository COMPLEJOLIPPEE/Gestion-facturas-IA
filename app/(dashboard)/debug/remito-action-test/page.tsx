import { RemitoForm } from "@/app/(dashboard)/remitos/nuevo/RemitoForm"
import { probarRemitoAction } from "./actions"

const producto = {
  id: "debug-producto",
  nombre: "Producto de prueba",
  codigo: "DEBUG",
}

export default async function RemitoActionTestPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; count?: string; fields?: string }>
}) {
  const params = await searchParams

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-8">
      <h1 className="text-2xl font-bold">Diagnóstico — formulario real de remito</h1>
      <p className="text-sm text-gray-600">
        Este es el RemitoForm real. La acción está reemplazada por una prueba que no modifica Supabase.
      </p>

      {params.ok === "1" && (
        <div className="rounded-lg border border-green-600 bg-green-50 p-4 text-green-900">
          <strong>POST del formulario real recibido correctamente.</strong>
          <div>Items: {params.count ?? "0"}</div>
          <div className="mt-1 break-words text-xs">Campos: {params.fields ?? "—"}</div>
        </div>
      )}

      <RemitoForm
        proveedores={[{ id: "debug-proveedor", nombre_fantasia: "Proveedor de prueba" }]}
        empresas={[{ id: "debug-empresa", razon_social: "Empresa de prueba" }]}
        productos={[producto]}
        formasPago={[{ id: "debug-pago", nombre: "Efectivo" }]}
        formAction={probarRemitoAction}
        initialLineas={[
          {
            producto_id: producto.id,
            cantidad: 1,
            precio_unitario: 1000,
            descuento: 0,
            bonificacion_importe: 0,
          },
        ]}
      />
    </main>
  )
}
