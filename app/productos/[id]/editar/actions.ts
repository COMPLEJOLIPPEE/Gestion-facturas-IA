'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function actualizarProducto(id: string, formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("productos")
    .update({
      codigo: formData.get("codigo") as string,
      nombre: formData.get("nombre") as string,
      unidad_medida: formData.get("unidad_medida") as string,
      categoria_id: (formData.get("categoria_id") as string) || null,
      costo_actual: Number(formData.get("costo_actual")),
      precio_venta: Number(formData.get("precio_venta")),
      iva: Number(formData.get("iva")),
      activo: formData.get("activo") === "on",
    })
    .eq("id", id)

  if (error) {
    throw new Error(`Error actualizando producto: ${error.message}`)
  }

  revalidatePath("/productos")
  revalidatePath(`/productos/${id}`)
  redirect(`/productos/${id}`)
}