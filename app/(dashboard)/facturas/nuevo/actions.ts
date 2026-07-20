'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

type ItemInput = {
  producto_id: string
  cantidad: number
  precio_unitario: number
  iva: number
}

export async function crearFactura(formData: FormData) {
  const supabase = await createClient()

  const itemsRaw = formData.get("items") as string
  const items: ItemInput[] = JSON.parse(itemsRaw || "[]")

  if (items.length === 0) {
    throw new Error("La factura necesita al menos una línea de producto")
  }

  const subtotal = Number(formData.get("subtotal"))
  const iva = Number(formData.get("iva"))
  const total = Number(formData.get("total"))

  const { data: factura, error: errorFactura } = await supabase
    .from("facturas")
    .insert({
      numero: (formData.get("numero") as string) || null,
      fecha: formData.get("fecha") as string,
      fecha_vencimiento: (formData.get("fecha_vencimiento") as string) || null,
      proveedor_id: formData.get("proveedor_id") as string,
      empresa_id: formData.get("empresa_id") as string,
      subtotal,
      iva,
      total,
      estado: "pendiente",
    })
    .select("id")
    .single()

  if (errorFactura || !factura) {
    throw new Error(`Error creando factura: ${errorFactura?.message}`)
  }

  const { error: errorItems } = await supabase.from("factura_items").insert(
    items.map((item) => ({
      factura_id: factura.id,
      producto_id: item.producto_id,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      iva: item.iva,
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

  revalidatePath("/facturas")
  revalidatePath("/productos")
  redirect(`/facturas/${factura.id}`)
}