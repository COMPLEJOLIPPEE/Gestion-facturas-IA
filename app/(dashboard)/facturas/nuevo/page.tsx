import { createClient } from "@/lib/supabase/server"
import { FacturaForm } from "./FacturaForm"

export default async function NuevaFacturaPage() {
  const supabase = await createClient()

  const [{ data: proveedores }, { data: empresas }, { data: productos }, { data: formasPago }] = await Promise.all([
    supabase.from("proveedores").select("id, nombre_fantasia").order("nombre_fantasia"),
    supabase.from("empresas").select("id, razon_social").order("razon_social"),
    supabase.from("productos").select("id, nombre, codigo, iva").order("nombre"),
    supabase.from("formas_pago").select("id, nombre").order("nombre"),
  ])

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">📄 Nueva factura</h1>
      <FacturaForm
        proveedores={proveedores ?? []}
        empresas={empresas ?? []}
        productos={productos ?? []}
        formasPago={formasPago ?? []}
      />
    </div>
  )
}
