"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function crearProveedor(formData: FormData) {
  const supabase = await createClient();

  const get = (key: string) =>
    String(formData.get(key) ?? "").trim();

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

      condicion_iva:
        get("condicion_iva") || null,

      condicion_pago:
        get("condicion_pago") || null,

      iibb_bsas:
        Number(get("iibb_bsas")) || 0,

      iibb_caba:
        Number(get("iibb_caba")) || 0,

      otros_cargos:
        get("otros_cargos") || null,

      etiqueta_1:
        get("etiqueta_1") || null,

      etiqueta_2:
        get("etiqueta_2") || null,

      activo: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/proveedores");

  redirect("/proveedores");
}