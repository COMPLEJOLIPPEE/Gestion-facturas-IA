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

function redondear(valor: number) {
  return Number(valor.toFixed(2))
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

  const { data: pagosPrevios, error: errorPagosPrevios } = await supabase
    .from("pagos")
    .select("monto")
    .eq("factura_id", comprobanteId)

  if (errorPagosPrevios) {
    throw new Error(`Error consultando pagos previos: ${errorPagosPrevios.message}`)
  }

  const totalPagadoAntes = (pagosPrevios ?? []).reduce((acc, p) => acc + Number(p.monto ?? 0), 0)
  const total = Number(factura.total ?? 0)
  const saldoPendiente = Math.max(0, redondear(total - totalPagadoAntes))
  if (monto > saldoPendiente + 0.01) {
    throw new Error(`El pago de $${monto.toFixed(2)} supera el saldo pendiente de $${saldoPendiente.toFixed(2)}.`)
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

  const totalPagado = totalPagadoAntes + monto
  const nuevoEstado = totalPagado >= total ? "pagada" : totalPagado > 0 ? "parcial" : "pendiente"

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

  const { data: pagosPrevios, error: errorPagosPrevios } = await supabase
    .from("pagos")
    .select("monto")
    .eq("remito_id", comprobanteId)

  if (errorPagosPrevios) {
    throw new Error(`Error consultando pagos previos: ${errorPagosPrevios.message}`)
  }

  const totalPagadoAntes = (pagosPrevios ?? []).reduce((acc, p) => acc + Number(p.monto ?? 0), 0)
  const total = Number(remito.monto_total ?? 0)
  const saldoPendiente = Math.max(0, redondear(total - totalPagadoAntes))
  if (monto > saldoPendiente + 0.01) {
    throw new Error(`El pago de $${monto.toFixed(2)} supera el saldo pendiente de $${saldoPendiente.toFixed(2)}.`)
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

  const totalPagado = totalPagadoAntes + monto
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

  if (!comprobanteId || !Number.isFinite(monto) || monto <= 0) {
    throw new Error("El monto del pago debe ser mayor a cero")
  }

  return params.tipo === "factura"
    ? registrarPagoFactura(supabase, params)
    : registrarPagoRemito(supabase, params)
}
