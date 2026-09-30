'use server'

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function probarRemitoAction(formData: FormData) {
  const itemsRaw = String(formData.get("items") ?? "")
  const itemCount = itemsRaw ? JSON.parse(itemsRaw).length : 0

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) {
    redirect("/debug/remito-action-test?ok=0&stage=auth&detail=" + encodeURIComponent(error.message))
  }

  if (!user) {
    redirect("/debug/remito-action-test?ok=0&stage=auth&detail=sin-usuario")
  }

  redirect(
    "/debug/remito-action-test?ok=1&stage=auth&detail=" +
    encodeURIComponent("auth OK · usuario obtenido · items " + itemCount)
  )
}
