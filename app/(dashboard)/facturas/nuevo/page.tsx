import { createClient } from "@/lib/supabase/server"
import { FacturaForm } from "./FacturaForm"

export default async function NuevaFacturaPage() {
  const supabase = await createClient()

  const [{ data: proveedores }, { data: empresas }, { data: productos }] = await Promise.all([
    supabase.from("proveedores").select("id, nombre_fantasia").order("nombre_fantasia"),
    supabase.from("empresas").select("id, razon_social").order("razon_social"),
    supabase.from("productos").select("id, nombre, codigo, iva").order("nombre"),
  ])

  const FacturaFormComponent = FacturaForm as any

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">📄 Nueva factura</h1>
      <FacturaFormComponent
        proveedores={proveedores ?? []}
        empresas={empresas ?? []}
        productos={productos ?? []}
      />
    </div>
  )
}