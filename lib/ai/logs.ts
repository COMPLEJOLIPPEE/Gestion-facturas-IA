import { createClient } from "@/lib/supabase/server"

export type IAProveedor = "Gemini" | "OCR.space"

export type IAEstado =
  | "procesando"
  | "exitoso"
  | "error"
  | "autorizado"
  | "cancelado"

type CrearLogIAParams = {
  facturaId?: string | null
  proveedorIA: IAProveedor
  iaSecundaria?: IAProveedor | null
}

export async function crearLogIA({
  facturaId = null,
  proveedorIA,
  iaSecundaria = null,
}: CrearLogIAParams) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("ia_procesamientos")
    .insert({
      factura_id: facturaId,
      proveedor_ia: proveedorIA,
      ia_secundaria: iaSecundaria,
      estado: "procesando",
    })
    .select("id")
    .single()

  if (error) {
    console.error(
      "Error creando log de IA:",
      error
    )

    return null
  }

  return data.id as string
}

type ActualizarLogIAParams = {
  logId: string
  estado: IAEstado
  motivoError?: string | null
  accionUsuario?: string | null
  lineasDetectadas?: number | null
}

export async function actualizarLogIA({
  logId,
  estado,
  motivoError = null,
  accionUsuario = null,
  lineasDetectadas = null,
}: ActualizarLogIAParams) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("ia_procesamientos")
    .update({
      estado,
      motivo_error: motivoError,
      accion_usuario: accionUsuario,
      lineas_detectadas: lineasDetectadas,
      finalizado_en:
        estado === "procesando"
          ? null
          : new Date().toISOString(),
    })
    .eq("id", logId)

  if (error) {
    console.error(
      "Error actualizando log de IA:",
      error
    )
  }
}
