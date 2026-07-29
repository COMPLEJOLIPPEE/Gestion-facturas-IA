"use server"

import { createClient } from "@/lib/supabase/server"
import { registrarPago } from "@/lib/pagos"
import { revalidatePath } from "next/cache"

export async function registrarPagoRemito(remitoId: string, formData: FormData) {
  const supabase = await createClient()

  const monto = Number(formData.get("monto"))
  const formaPagoId = (formData.get("forma_pago_id") as string) || null
  const fecha = formData.get("fecha") as string

  await registrarPago(supabase, { tipo: "remito", comprobanteId: remitoId, monto, formaPagoId, fecha })

  revalidatePath(`/remitos/${remitoId}`)
  revalidatePath("/remitos")
  revalidatePath("/pagos")
  revalidatePath("/dashboard")
}
