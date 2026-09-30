import { RemitoForm } from "@/app/(dashboard)/remitos/nuevo/RemitoForm"
import { probarRemitoAction } from "./actions"

const producto = { id: "debug-producto", nombre: "Producto de prueba", codigo: "DEBUG" }

export default async function RemitoActionTestPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; stage?: string; detail?: string }>
}) {
  const params = await searchParams
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-8">
      <h1 className="text-2xl font-bold">Diagnóstico — crearRemito</h1>
      <p className="text-sm text-gray-600">
        Etapa actual: empresa activa + acceso. No inserta ni modifica datos.
      </p>
      {params.stage && (
        <div className={params.ok === "1"
          ? "rounded-lg border border-green-600 bg-green-50 p-4 text-green-900"
          : "rounded-lg border border-red-600 bg-red-50 p-4 text-red-900"}>
          <strong>{params.ok === "1" ? "Etapa ejecutada correctamente." : "La etapa devolvió un error."}</strong>
          <div>{params.detail ?? "—"}</div>
        </div>
      )}
      <RemitoForm
        proveedores={[{ id: "debug-proveedor", nombre_fantasia: "Proveedor de prueba" }]}
        empresas={[{ id: "debug-empresa", razon_social: "Empresa de prueba" }]}
        productos={[producto]}
        formasPago={[{ id: "debug-pago", nombre: "Efectivo" }]}
        formAction={probarRemitoAction}
        initialLineas={[{ producto_id: producto.id, cantidad: 1, precio_unitario: 1000, descuento: 0, bonificacion_importe: 0 }]}
      />
    </main>
  )
}
