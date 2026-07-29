import { createClient } from "@/lib/supabase/server"

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

export type TipoComprobante = "factura" | "remito"

type ParamsPago = {
  tipo: TipoComprobante
  comprobanteId: string
  monto: number
  formaPagoId: string | null
  fecha: string
}

async function registrarPagoFactura(supabase: SupabaseClient, params: ParamsPago) {
  const { comprobanteId, monto, formaPagoId, fecha } = params

  const { data: factura, error: errorFactura } = await supabase
    .from("facturas")
    .select("total")
    .eq("id", comprobanteId)
    .single()

  if (errorFactura || !factura) {
    throw new Error(`Error buscando el comprobante: ${errorFactura?.message}`)
  }

  const { error: errorPago } = await supabase.from("pagos").insert({
    factura_id: comprobanteId,
    monto,
    forma_pago_id: formaPagoId,
    fecha,
  })

  if (errorPago) {
    throw new Error(`Error registrando el pago: ${errorPago.message}`)
  }

  const { data: pagosPrevios, error: errorPagosPrevios } = await supabase
    .from("pagos")
    .select("monto")
    .eq("factura_id", comprobanteId)

  if (errorPagosPrevios) {
    throw new Error(`Error recalculando pagos: ${errorPagosPrevios.message}`)
  }

  const totalPagado = (pagosPrevios ?? []).reduce((acc, p) => acc + Number(p.monto ?? 0), 0)
  const total = Number(factura.total ?? 0)
  const nuevoEstado = totalPagado >= total ? "pagado" : totalPagado > 0 ? "parcial" : "pendiente"

  const { error: errorUpdate } = await supabase
    .from("facturas")
    .update({ estado: nuevoEstado })
    .eq("id", comprobanteId)

  if (errorUpdate) {
    throw new Error(`Error actualizando estado: ${errorUpdate.message}`)
  }

  return nuevoEstado
}

async function registrarPagoRemito(supabase: SupabaseClient, params: ParamsPago) {
  const { comprobanteId, monto, formaPagoId, fecha } = params

  const { data: remito, error: errorRemito } = await supabase
    .from("remitos")
    .select("monto_total")
    .eq("id", comprobanteId)
    .single()

  if (errorRemito || !remito) {
    throw new Error(`Error buscando el comprobante: ${errorRemito?.message}`)
  }

  const { error: errorPago } = await supabase.from("pagos").insert({
    remito_id: comprobanteId,
    monto,
    forma_pago_id: formaPagoId,
    fecha,
  })

  if (errorPago) {
    throw new Error(`Error registrando el pago: ${errorPago.message}`)
  }

  const { data: pagosPrevios, error: errorPagosPrevios } = await supabase
    .from("pagos")
    .select("monto")
    .eq("remito_id", comprobanteId)

  if (errorPagosPrevios) {
    throw new Error(`Error recalculando pagos: ${errorPagosPrevios.message}`)
  }

  const totalPagado = (pagosPrevios ?? []).reduce((acc, p) => acc + Number(p.monto ?? 0), 0)
  const total = Number(remito.monto_total ?? 0)
  const nuevoEstado = totalPagado >= total ? "pagado" : totalPagado > 0 ? "parcial" : "pendiente"

  const { error: errorUpdate } = await supabase
    .from("remitos")
    .update({ estado: nuevoEstado })
    .eq("id", comprobanteId)

  if (errorUpdate) {
    throw new Error(`Error actualizando estado: ${errorUpdate.message}`)
  }

  return nuevoEstado
}

export async function registrarPago(supabase: SupabaseClient, params: ParamsPago) {
  const { comprobanteId, monto } = params

  if (!comprobanteId || !monto || monto <= 0) {
    throw new Error("Faltan datos para registrar el pago")
  }

  return params.tipo === "factura"
    ? registrarPagoFactura(supabase, params)
    : registrarPagoRemito(supabase, params)
}