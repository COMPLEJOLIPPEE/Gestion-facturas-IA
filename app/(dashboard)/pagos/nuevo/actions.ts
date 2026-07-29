"use server"

import { createClient } from "@/lib/supabase/server"
import { registrarPago } from "@/lib/pagos"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function crearPago(formData: FormData) {
  const supabase = await createClient()

  const tipo = formData.get("tipo") as "factura" | "remito"
  const comprobanteId = formData.get("comprobante_id") as string
  const monto = Number(formData.get("monto"))
  const formaPagoId = (formData.get("forma_pago_id") as string) || null
  const fecha = formData.get("fecha") as string

  await registrarPago(supabase, { tipo, comprobanteId, monto, formaPagoId, fecha })

  const tabla = tipo === "factura" ? "facturas" : "remitos"
  revalidatePath("/pagos")
  revalidatePath(`/${tabla}`)
  revalidatePath(`/${tabla}/${comprobanteId}`)
  revalidatePath("/dashboard")
  redirect("/pagos")
}
