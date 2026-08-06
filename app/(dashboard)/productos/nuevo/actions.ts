'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function crearProducto(formData: FormData) {
  const supabase = await createClient();

  const nombre = (formData.get("nombre") as string)?.trim();

  if (!nombre) {
    throw new Error("El nombre del producto es obligatorio.");
  }

  const { data: existente } = await supabase
    .from("productos")
    .select("id")
    .ilike("nombre", nombre)
    .maybeSingle();

  if (existente) {
    redirect(
      `/productos/nuevo?error=${encodeURIComponent(
        "Ya existe un producto con ese nombre."
      )}`
    );
  }

  const { data: producto, error } = await supabase
    .from("productos")
    .insert({
      nombre,
      unidad_medida:
        (formData.get("unidad_medida") as string) || null,
      categoria_id:
        (formData.get("categoria_id") as string) || null,
      costo_actual:
        Number(formData.get("costo_actual")) || 0,
      precio_venta:
        Number(formData.get("precio_venta")) || 0,
      activo:
        formData.get("activo") === "on",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/productos");

  redirect(`/productos/${producto.id}`);
}