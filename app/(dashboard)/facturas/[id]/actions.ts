"use server"

import { createClient } from "@/lib/supabase/server"
import { registrarPago } from "@/lib/pagos"
import { revalidatePath } from "next/cache"

export async function registrarPagoFactura(facturaId: string, formData: FormData) {
  const supabase = await createClient()

  const monto = Number(formData.get("monto"))
  const formaPagoId = (formData.get("forma_pago_id") as string) || null
  const fecha = formData.get("fecha") as string

  await registrarPago(supabase, { tipo: "factura", comprobanteId: facturaId, monto, formaPagoId, fecha })

  revalidatePath(`/facturas/${facturaId}`)
  revalidatePath("/facturas")
  revalidatePath("/pagos")
  revalidatePath("/dashboard")
}
