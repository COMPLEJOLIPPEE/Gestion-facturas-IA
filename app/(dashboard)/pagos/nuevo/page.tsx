import { createClient } from "@/lib/supabase/server"
import { PagoForm } from "./PagoForm"

export default async function NuevoPagoPage() {
  const supabase = await createClient()

  const [{ data: facturasPendientes }, { data: remitosPendientes }, { data: formasPago }] = await Promise.all([
    supabase
      .from("facturas")
      .select("id, numero, total, proveedores (nombre_fantasia)")
      .neq("estado", "pagado")
      .order("fecha", { ascending: false }),
    supabase
      .from("remitos")
      .select("id, numero, monto_total, proveedores (nombre_fantasia)")
      .neq("estado", "pagado")
      .order("fecha", { ascending: false }),
    supabase.from("formas_pago").select("id, nombre").order("nombre"),
  ])

  const facturaIds = (facturasPendientes ?? []).map((f) => f.id)
  const remitoIds = (remitosPendientes ?? []).map((r) => r.id)

  const [{ data: pagosDeFacturas }, { data: pagosDeRemitos }] = await Promise.all([
    facturaIds.length > 0
      ? supabase.from("pagos").select("factura_id, monto").in("factura_id", facturaIds)
      : Promise.resolve({ data: [] as { factura_id: string | null; monto: number }[] }),
    remitoIds.length > 0
      ? supabase.from("pagos").select("remito_id, monto").in("remito_id", remitoIds)
      : Promise.resolve({ data: [] as { remito_id: string | null; monto: number }[] }),
  ])

  const pagadoPorFactura = new Map<string, number>()
  for (const p of pagosDeFacturas ?? []) {
    if (!p.factura_id) continue
    pagadoPorFactura.set(p.factura_id, (pagadoPorFactura.get(p.factura_id) ?? 0) + Number(p.monto ?? 0))
  }

  const pagadoPorRemito = new Map<string, number>()
  for (const p of pagosDeRemitos ?? []) {
    if (!p.remito_id) continue
    pagadoPorRemito.set(p.remito_id, (pagadoPorRemito.get(p.remito_id) ?? 0) + Number(p.monto ?? 0))
  }

  const facturas = (facturasPendientes ?? []).map((f) => {
    const proveedor = Array.isArray(f.proveedores) ? f.proveedores[0] : f.proveedores
    const total = Number(f.total ?? 0)
    const pagado = pagadoPorFactura.get(f.id) ?? 0
    return {
      id: f.id,
      numero: f.numero,
      proveedor: proveedor?.nombre_fantasia ?? "—",
      total,
      saldo: Math.max(total - pagado, 0),
    }
  })

  const remitos = (remitosPendientes ?? []).map((r) => {
    const proveedor = Array.isArray(r.proveedores) ? r.proveedores[0] : r.proveedores
    const total = Number(r.monto_total ?? 0)
    const pagado = pagadoPorRemito.get(r.id) ?? 0
    return {
      id: r.id,
      numero: r.numero,
      proveedor: proveedor?.nombre_fantasia ?? "—",
      total,
      saldo: Math.max(total - pagado, 0),
    }
  })

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">💰 Registrar pago</h1>
      <PagoForm facturas={facturas} remitos={remitos} formasPago={formasPago ?? []} />
    </div>
  )
}
