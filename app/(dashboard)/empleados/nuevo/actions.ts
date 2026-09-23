"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canWrite, getCurrentRole } from "@/lib/auth/permissions";

export async function crearEmpleado(formData: FormData) {
  const role = await getCurrentRole();
  if (!canWrite(role)) throw new Error("No tenés permisos para crear empleados.");
  const supabase = await createClient();
  const get = (key:string) => String(formData.get(key) ?? "").trim();
  const nombre=get("nombre"), apellido=get("apellido");
  if (!nombre || !apellido) throw new Error("Nombre y apellido son obligatorios.");
  const { error } = await supabase.from("empleados").insert({
    nombre, apellido, documento:get("documento")||null, telefono:get("telefono")||null,
    email:get("email")||null, fecha_ingreso:get("fecha_ingreso")||null,
    periodicidad_pago:get("periodicidad_pago")||null, observaciones:get("observaciones")||null, activo:true,
  });
  if(error) throw new Error(error.message);
  revalidatePath("/empleados"); redirect("/empleados");
}
