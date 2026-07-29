"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function crearProveedor(formData: FormData) {
  const supabase = await createClient();

  const get = (key: string) => String(formData.get(key) ?? "").trim();

  const categoriaId = get("categoria_id");

  if (!categoriaId) {
    throw new Error("Debe seleccionar una categoría.");
  }

  const { error } = await supabase
    .from("proveedores")
    .insert({
      nombre_fantasia: get("nombre_fantasia"),
      razon_social: get("razon_social"),
      cuit: get("cuit"),
      telefono: get("telefono"),
      email: get("email"),
      categoria_id: categoriaId,
      etiqueta_1: get("etiqueta_1") || null,
      etiqueta_2: get("etiqueta_2") || null,
      condicion_pago: get("condicion_pago") || null,
      activo: true,
    });

  if (error) {
    throw new Error(`Error creando proveedor: ${error.message}`);
  }

  revalidatePath("/proveedores");
  redirect("/proveedores");
}