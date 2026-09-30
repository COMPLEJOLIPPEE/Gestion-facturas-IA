'use server'

import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

const EMPRESA_COOKIE = "factura_ia_empresa_activa"

export async function probarRemitoAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect("/debug/remito-action-test?ok=0&stage=auth&detail=" + encodeURIComponent(authError?.message ?? "sin usuario"))
  }

  const cookieStore = await cookies()
  let empresaId = cookieStore.get(EMPRESA_COOKIE)?.value ?? null

  if (!empresaId) {
    const { data: primerAcceso, error } = await supabase
      .from("usuario_empresa")
      .select("empresa_id")
      .eq("usuario_id", user!.id)
      .eq("activo", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) {
      redirect("/debug/remito-action-test?ok=0&stage=empresa&detail=" + encodeURIComponent(error.message))
    }

    empresaId = primerAcceso?.empresa_id ?? null
  }

  if (!empresaId) {
    redirect("/debug/remito-action-test?ok=0&stage=empresa&detail=No hay empresa activa")
  }

  const { data: accesoEmpresa, error: accesoError } = await supabase
    .from("usuario_empresa")
    .select("empresa_id")
    .eq("usuario_id", user!.id)
    .eq("empresa_id", empresaId)
    .eq("activo", true)
    .maybeSingle()

  if (accesoError) {
    redirect("/debug/remito-action-test?ok=0&stage=acceso&detail=" + encodeURIComponent(accesoError.message))
  }

  if (!accesoEmpresa) {
    redirect("/debug/remito-action-test?ok=0&stage=acceso&detail=Usuario sin acceso a empresa")
  }

  redirect("/debug/remito-action-test?ok=1&stage=empresa&detail=" + encodeURIComponent("Empresa y acceso OK · " + empresaId))
}
