"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function actualizarProveedor(
  id: string,
  formData: FormData
) {
  const supabase = await createClient();

  const get = (key: string) =>
    String(formData.get(key) ?? "").trim();

  const { error } = await supabase
    .from("proveedores")
    .update({
      nombre_fantasia: get("nombre_fantasia"),
      razon_social: get("razon_social"),
      cuit: get("cuit"),
      telefono: get("telefono"),
      email: get("email"),

      categoria_id:
        get("categoria_id") || null,

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
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/proveedores");
  revalidatePath(`/proveedores/${id}`);

  redirect(`/proveedores/${id}`);
}

export async function eliminarProveedor(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("proveedores")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/proveedores");

  redirect("/proveedores");
}