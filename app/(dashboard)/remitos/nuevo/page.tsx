import { createClient } from "@/lib/supabase/server"
import { RemitoForm } from "./RemitoForm"

export default async function NuevoRemitoPage() {
  const supabase = await createClient()

  const [{ data: proveedores }, { data: empresas }, { data: productos }] = await Promise.all([
    supabase.from("proveedores").select("id, nombre_fantasia").order("nombre_fantasia"),
    supabase.from("empresas").select("id, razon_social").order("razon_social"),
    supabase.from("productos").select("id, nombre, codigo").order("nombre"),
  ])

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">📝 Nuevo remito</h1>
      <RemitoForm
        proveedores={proveedores ?? []}
        empresas={empresas ?? []}
        productos={productos ?? []}
      />
    </div>
  )
}