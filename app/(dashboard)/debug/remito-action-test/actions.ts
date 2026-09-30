'use server'

import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

type ItemInput = {
  producto_id: string
  cantidad: number
  precio_unitario: number
  descuento?: number
  bonificacion_importe?: number
  precio_final?: number
  porcentaje_descuento?: number | null
  bonificacion_tipo?: string | null
  cantidad_bonificada?: number | null
}

const EMPRESA_COOKIE = "factura_ia_empresa_activa"

function go(stage: string, detail: string) {
  redirect("/debug/remito-action-test?ok=1&stage=" + encodeURIComponent(stage) + "&detail=" + encodeURIComponent(detail))
}

export async function probarRemitoAction(formData: FormData) {
  const stage = String(formData.get("stage") ?? "parse")
  const itemsRaw = String(formData.get("items") ?? "")
  const items: ItemInput[] = JSON.parse(itemsRaw || "[]")

  if (stage === "parse") {
    go("parse", "JSON parseado: " + items.length + " items")
  }

  const itemsProcesados = items.map((item) => {
    const cantidad = Math.max(0, Number(item.cantidad ?? 0))
    const precioUnitario = Math.max(0, Number(item.precio_unitario ?? 0))
    const bruto = cantidad * precioUnitario
    const porcentaje = Math.min(100, Math.max(0, Number(item.descuento ?? 0)))
    const descuentoImporte = bruto * (porcentaje / 100)
    const bonificacion = Math.max(0, Number(item.bonificacion_importe ?? 0))
    const neto = Math.max(0, bruto - descuentoImporte - bonificacion)
    return {
      ...item,
      cantidad,
      precio_unitario: precioUnitario,
      precio_bruto_unitario: precioUnitario,
      descuento_importe: descuentoImporte,
      bonificacion_importe: bonificacion,
      precio_neto_unitario: cantidad > 0 ? neto / cantidad : 0,
      subtotal_neto: neto,
      precio_final: neto,
      porcentaje_descuento: porcentaje,
    }
  })

  if (stage === "process") {
    go("process", "itemsProcesados: " + itemsProcesados.length)
  }

  const total = itemsProcesados.reduce((acumulado, item) => acumulado + item.subtotal_neto, 0)

  if (stage === "total") {
    go("total", "total calculado: " + total)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) go("auth", "sin usuario")

  if (stage === "auth") {
    go("auth", "usuario autenticado")
  }

  const cookieStore = await cookies()
  let empresaId = cookieStore.get(EMPRESA_COOKIE)?.value ?? null

  if (!empresaId) {
    const { data: primerAcceso } = await supabase
      .from("usuario_empresa")
      .select("empresa_id")
      .eq("usuario_id", user!.id)
      .eq("activo", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()
    empresaId = primerAcceso?.empresa_id ?? null
  }

  if (!empresaId) go("empresa", "no se encontro empresa activa")

  if (stage === "empresa") {
    go("empresa", "empresa activa: " + empresaId)
  }

  const { data: accesoEmpresa } = await supabase
    .from("usuario_empresa")
    .select("empresa_id")
    .eq("usuario_id", user!.id)
    .eq("empresa_id", empresaId)
    .eq("activo", true)
    .maybeSingle()

  if (!accesoEmpresa) go("acceso", "usuario sin acceso a empresa")

  go("acceso", "acceso a empresa verificado")
}
