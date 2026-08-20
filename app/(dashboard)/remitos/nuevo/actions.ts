'use server'

import { createClient } from "@/lib/supabase/server"
import { registrarPago } from "@/lib/pagos"
import { revalidatePath } from "next/cache"
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

export async function crearRemito(formData: FormData) {
  const supabase = await createClient()
  const itemsRaw = formData.get("items") as string
  const items: ItemInput[] = JSON.parse(itemsRaw || "[]")

  if (items.length === 0) {
    throw new Error("El remito necesita al menos una línea de producto")
  }

  const itemsProcesados = items.map((item) => {
    const bruto = Number(item.cantidad ?? 0) * Number(item.precio_unitario ?? 0)
    const descuento = Math.max(0, Number(item.descuento ?? 0))
    const bonificacion = Math.max(0, Number(item.bonificacion_importe ?? 0))
    const neto = Math.max(0, bruto - descuento - bonificacion)

    return {
      ...item,
      precio_bruto_unitario: Number(item.precio_unitario ?? 0),
      descuento_importe: descuento,
      bonificacion_importe: bonificacion,
      precio_neto_unitario:
        Number(item.cantidad ?? 0) > 0 ? neto / Number(item.cantidad) : 0,
      subtotal_neto: neto,
      precio_final: neto,
    }
  })

  const total = itemsProcesados.reduce(
    (acumulado, item) => acumulado + item.subtotal_neto,
    0
  )

  const { data: remito, error: errorRemito } = await supabase
    .from("remitos")
    .insert({
      numero: (formData.get("numero") as string) || null,
      fecha: formData.get("fecha") as string,
      fecha_vencimiento: (formData.get("fecha_vencimiento") as string) || null,
      proveedor_id: formData.get("proveedor_id") as string,
      empresa_id: formData.get("empresa_id") as string,
      monto_total: total,
    })
    .select("id")
    .single()

  if (errorRemito || !remito) {
    throw new Error(`Error creando remito: ${errorRemito?.message}`)
  }

  const itemsParaGuardar = itemsProcesados.map((item) => ({
    remito_id: remito.id,
    producto_id: item.producto_id,
    cantidad: item.cantidad,
    precio_unitario: item.precio_unitario,
    descuento: item.descuento_importe,
    precio_final: item.precio_final,
    precio_bruto_unitario: item.precio_bruto_unitario,
    descuento_importe: item.descuento_importe,
    bonificacion_importe: item.bonificacion_importe,
    precio_neto_unitario: item.precio_neto_unitario,
    subtotal_neto: item.subtotal_neto,
    descuentos_detalle: item.porcentaje_descuento
      ? { porcentaje: item.porcentaje_descuento }
      : null,
    bonificacion_tipo: item.bonificacion_tipo ?? null,
    cantidad_bonificada: item.cantidad_bonificada ?? null,
  }))

  // Las columnas nuevas de remito_items todavía no están reflejadas en
  // lib/database.types.ts; la estructura ya fue creada en Supabase.
  const { error: errorItems } = await supabase
    .from("remito_items")
    .insert(itemsParaGuardar as never)

  if (errorItems) {
    throw new Error(`Error guardando items: ${errorItems.message}`)
  }

  for (const item of itemsProcesados) {
    const { data: productoActual } = await supabase
      .from("productos")
      .select("costo_actual")
      .eq("id", item.producto_id)
      .single()

    await supabase
      .from("productos")
      .update({
        ultimo_costo: productoActual?.costo_actual ?? null,
        costo_actual: item.precio_neto_unitario,
      })
      .eq("id", item.producto_id)
  }

  const pagarAlCargar = formData.get("pagar_al_cargar") === "1"
  if (pagarAlCargar) {
    const montoPago = Number(formData.get("pago_monto"))
    const formaPagoId = (formData.get("pago_forma_pago_id") as string) || null
    const fechaPago = formData.get("pago_fecha") as string

    await registrarPago(supabase, {
      tipo: "remito",
      comprobanteId: remito.id,
      monto: montoPago,
      formaPagoId,
      fecha: fechaPago,
    })

    revalidatePath("/pagos")
    revalidatePath("/dashboard")
  }

  revalidatePath("/remitos")
  revalidatePath("/productos")
  redirect(`/remitos/${remito.id}`)
}
