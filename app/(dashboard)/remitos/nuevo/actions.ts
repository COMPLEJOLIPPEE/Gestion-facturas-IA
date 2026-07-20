'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

type ItemInput = {
  producto_id: string
  cantidad: number
  precio_unitario: number
}

export async function crearRemito(formData: FormData) {
  const supabase = await createClient()

  const itemsRaw = formData.get("items") as string
  const items: ItemInput[] = JSON.parse(itemsRaw || "[]")

  if (items.length === 0) {
    throw new Error("El remito necesita al menos una línea de producto")
  }

  const montoTotal = Number(formData.get("monto_total"))

  const { data: remito, error: errorRemito } = await supabase
    .from("remitos")
    .insert({
      numero: (formData.get("numero") as string) || null,
      fecha: formData.get("fecha") as string,
      fecha_vencimiento: (formData.get("fecha_vencimiento") as string) || null,
      proveedor_id: formData.get("proveedor_id") as string,
      empresa_id: formData.get("empresa_id") as string,
      monto_total: montoTotal,
      estado: "pendiente",
    })
    .select("id")
    .single()

  if (errorRemito || !remito) {
    throw new Error(`Error creando remito: ${errorRemito?.message}`)
  }

  const { error: errorItems } = await supabase.from("remito_items").insert(
    items.map((item) => ({
      remito_id: remito.id,
      producto_id: item.producto_id,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
    }))
  )

  if (errorItems) {
    throw new Error(`Error guardando items: ${errorItems.message}`)
  }

  for (const item of items) {
    const { data: productoActual } = await supabase
      .from("productos")
      .select("costo_actual")
      .eq("id", item.producto_id)
      .single()

    await supabase
      .from("productos")
      .update({
        ultimo_costo: productoActual?.costo_actual ?? null,
        costo_actual: item.precio_unitario,
      })
      .eq("id", item.producto_id)
  }

  revalidatePath("/remitos")
  revalidatePath("/productos")
  redirect(`/remitos/${remito.id}`)
}