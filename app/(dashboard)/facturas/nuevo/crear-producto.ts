"use server"

import { createClient } from "@/lib/supabase/server"

export async function crearProductoDesdeFactura(data: {
  nombre: string
  costo: number
  iva: number
}) {
  const supabase = await createClient()

  const nombre = data.nombre.trim()

  if (!nombre) {
    throw new Error("El nombre del producto es obligatorio.")
  }

  const { data: existente } = await supabase
    .from("productos")
    .select("id, nombre, codigo")
    .ilike("nombre", nombre)
    .maybeSingle()

  if (existente) {
    return existente
  }

  const { data: producto, error } = await supabase
    .from("productos")
    .insert({
      nombre,
      costo_actual: data.costo,
      precio_venta: 0,
      activo: true,
    })
    .select("id, nombre, codigo")
    .single()

  if (error || !producto) {
    throw new Error(
      error?.message || "No fue posible crear el producto."
    )
  }

  return producto
}