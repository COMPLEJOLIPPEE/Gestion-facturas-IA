"use server"

import { createClient } from "@/lib/supabase/server"
import { registrarPago } from "@/lib/pagos"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

type DescuentoDetalle = { porcentaje?: number | null; importe?: number | null; descripcion?: string | null }
type CargoInput = { descripcion: string; importe: number }
type ItemInput = {
  producto_id: string
  cantidad: number
  precio_unitario: number
  precio_neto?: number | null
  precio_final?: number | null
  subtotal_neto?: number | null
  iva: number
  iva_importe?: number | null
  descuento?: number
  descuentos?: DescuentoDetalle[]
  grupo_descuento?: string | null
  bonificacion?: number | null
  tipo_bonificacion?: "porcentaje" | "cantidad" | "importe" | null
  cantidad_bonificada?: number | null
  cantidad_bonificada_detalle?: number | null
  impuestos_internos?: number | null
  cargos?: CargoInput[]
  columnas_presentes?: string[]
  tipo_linea?: "producto" | "ajuste"
  es_ajuste_negativo?: boolean
  descripcionLeida?: string | null
}

function numero(valor: unknown) { const resultado = Number(valor ?? 0); return Number.isFinite(resultado) ? resultado : 0 }
function redondear(valor: number) { return Number(valor.toFixed(2)) }
function coincide(a: number, b: number) { return Math.abs(a - b) <= 0.50 }
const EMPRESA_COOKIE = "factura_ia_empresa_activa"

function calcularLinea(item: ItemInput) {
  const cantidad = Math.max(0, numero(item.cantidad))
  const precioUnitario = numero(item.precio_unitario)
  const bruto = cantidad * Math.abs(precioUnitario)
  const ajuste = item.tipo_linea === "ajuste" || item.es_ajuste_negativo === true || precioUnitario < 0
  const descuento = ajuste ? 0 : Math.abs(numero(item.descuento))
  const bonificacion = ajuste ? 0 : Math.abs(numero(item.bonificacion))
  const cargo = (item.cargos ?? []).reduce((s, c) => s + Math.abs(numero(c.importe)), 0)
  const subtotalExplicito = item.subtotal_neto != null && Number.isFinite(Number(item.subtotal_neto)) ? numero(item.subtotal_neto) : null
  const subtotalNeto = ajuste
    ? -(subtotalExplicito != null && subtotalExplicito !== 0 ? Math.abs(subtotalExplicito) : Math.abs(bruto))
    : subtotalExplicito != null
      ? Math.abs(subtotalExplicito)
      : Math.max(0, bruto + cargo - descuento - bonificacion)
  const ivaImporte = item.iva_importe != null && numero(item.iva_importe) !== 0 ? (ajuste ? -Math.abs(numero(item.iva_importe)) : Math.abs(numero(item.iva_importe))) : redondear(subtotalNeto * (numero(item.iva) / 100))
  const impuestosInternos = ajuste ? -Math.abs(numero(item.impuestos_internos)) : Math.abs(numero(item.impuestos_internos))
  const precioNetoUnitario = cantidad > 0 ? subtotalNeto / cantidad : precioUnitario
  return { cantidad, precioUnitario, bruto, ajuste, descuento, bonificacion, cargo, subtotalNeto, ivaImporte, impuestosInternos, precioNetoUnitario }
}

export async function crearFactura(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const cookieStore = await cookies()
  let empresaId = cookieStore.get(EMPRESA_COOKIE)?.value ?? null
  if (!empresaId) {
    const { data: primerAcceso } = await supabase.from("usuario_empresa").select("empresa_id").eq("usuario_id", user.id).eq("activo", true).order("created_at", { ascending: true }).limit(1).maybeSingle()
    empresaId = primerAcceso?.empresa_id ?? null
  }
  if (!empresaId) throw new Error("No hay una empresa activa configurada para este usuario.")

  const { data: accesoEmpresa } = await supabase.from("usuario_empresa").select("empresa_id").eq("usuario_id", user.id).eq("empresa_id", empresaId).eq("activo", true).maybeSingle()
  if (!accesoEmpresa) throw new Error("No tenés acceso a la empresa seleccionada.")

  const items: ItemInput[] = JSON.parse(String(formData.get("items") ?? "[]"))
  if (!items.length) throw new Error("La factura necesita al menos una línea")
  if (items.some((item) => (item.tipo_linea ?? "producto") === "producto" && !item.producto_id)) throw new Error("Todas las líneas de producto deben tener un producto seleccionado")

  let cargos: CargoInput[] = []
  try { cargos = JSON.parse(String(formData.get("cargos") ?? "[]")) } catch { throw new Error("Los cargos de la factura no tienen un formato válido.") }

  const cargosInternos = cargos.filter((cargo) => /impuestos?\s+internos?/i.test(cargo.descripcion))
  const otrosCargos = cargos.filter((cargo) => !/impuestos?\s+internos?/i.test(cargo.descripcion))
  const totalImpuestosInternosCargo = cargosInternos.reduce((acc, cargo) => acc + numero(cargo.importe), 0)
  const totalOtrosCargos = otrosCargos.reduce((acc, cargo) => acc + numero(cargo.importe), 0)

  const resumen = items.reduce((acc, item) => {
    const l = calcularLinea(item)
    acc.subtotalBruto += l.bruto
    acc.descuentos += l.descuento + l.bonificacion
    acc.subtotalNeto += l.subtotalNeto
    acc.iva += l.ivaImporte
    acc.impuestosInternos += l.impuestosInternos
    return acc
  }, { subtotalBruto: 0, descuentos: 0, subtotalNeto: 0, iva: 0, impuestosInternos: 0 })

  const subtotalCalculado = redondear(resumen.subtotalNeto)
  const ivaCalculado = redondear(resumen.iva)
  const impuestosInternos = redondear(resumen.impuestosInternos + totalImpuestosInternosCargo)
  const totalCalculado = redondear(subtotalCalculado + ivaCalculado + impuestosInternos + totalOtrosCargos)

  const iaSubtotal = formData.get("ia_subtotal_neto")
  const iaIva = formData.get("ia_iva_total")
  const iaTotal = formData.get("ia_total")
  const oficialSubtotal = iaSubtotal === null || iaSubtotal === "" ? null : numero(iaSubtotal)
  const oficialIva = iaIva === null || iaIva === "" ? null : numero(iaIva)
  const oficialTotal = iaTotal === null || iaTotal === "" ? null : numero(iaTotal)

  if (oficialSubtotal !== null && !coincide(subtotalCalculado, oficialSubtotal)) throw new Error(`La factura no coincide con el subtotal oficial del comprobante. Calculado: $${subtotalCalculado.toFixed(2)} / Oficial: $${oficialSubtotal.toFixed(2)}.`)
  if (oficialIva !== null && !coincide(ivaCalculado, oficialIva)) throw new Error(`La factura no coincide con el IVA oficial del comprobante. Calculado: $${ivaCalculado.toFixed(2)} / Oficial: $${oficialIva.toFixed(2)}.`)
  if (oficialTotal !== null && !coincide(totalCalculado, oficialTotal)) throw new Error(`La factura no coincide con el total oficial del comprobante. Calculado: $${totalCalculado.toFixed(2)} / Oficial: $${oficialTotal.toFixed(2)}.`)

  const subtotal = oficialSubtotal !== null && coincide(subtotalCalculado, oficialSubtotal) ? redondear(oficialSubtotal) : subtotalCalculado
  const iva = oficialIva !== null && coincide(ivaCalculado, oficialIva) ? redondear(oficialIva) : ivaCalculado
  const total = oficialTotal !== null && coincide(totalCalculado, oficialTotal) ? redondear(oficialTotal) : totalCalculado

  const { data: factura, error: errorFactura } = await supabase.from("facturas").insert({ numero: (formData.get("numero") as string) || null, fecha: formData.get("fecha") as string, fecha_vencimiento: (formData.get("fecha_vencimiento") as string) || null, proveedor_id: formData.get("proveedor_id") as string, empresa_id: empresaId, subtotal, descuento_total: redondear(resumen.descuentos), iva, impuestos_internos: redondear(impuestosInternos), otros_cargos: redondear(totalOtrosCargos), total, estado: "pendiente" }).select("id").single()
  if (errorFactura || !factura) throw new Error(`Error creando factura: ${errorFactura?.message}`)

  const itemsParaGuardar = items.map((item) => {
    const l = calcularLinea(item)
    const descuentosDetalle = [...(item.descuentos ?? []), ...(item.grupo_descuento ? [{ descripcion: item.grupo_descuento, importe: l.descuento }] : [])]
    return {
      factura_id: factura.id,
      producto_id: l.ajuste ? null : item.producto_id,
      descripcion: item.descripcionLeida ?? null,
      tipo_linea: l.ajuste ? "ajuste" : "producto",
      es_ajuste_negativo: l.ajuste,
      cantidad: l.cantidad,
      precio_unitario: redondear(l.ajuste ? -Math.abs(l.precioUnitario) : Math.abs(l.precioUnitario)),
      iva: numero(item.iva),
      "alicuota IVA": numero(item.iva),
      descuento: redondear(l.descuento),
      precio_final: redondear(l.precioNetoUnitario),
      precio_bruto_unitario: redondear(l.ajuste ? -Math.abs(l.precioUnitario) : Math.abs(l.precioUnitario)),
      descuento_importe: redondear(l.descuento),
      bonificacion_importe: redondear(l.bonificacion),
      precio_neto_unitario: redondear(l.precioNetoUnitario),
      subtotal_neto: redondear(l.subtotalNeto),
      iva_importe: redondear(l.ivaImporte),
      impuestos_internos: redondear(l.impuestosInternos),
      descuentos_detalle: descuentosDetalle.length ? descuentosDetalle : null,
      bonificacion_tipo: item.tipo_bonificacion ?? null,
      cantidad_bonificada: numero(item.cantidad_bonificada ?? item.cantidad_bonificada_detalle) || null,
      cargos_detalle: item.cargos?.length ? item.cargos : null,
      columnas_presentes: item.columnas_presentes?.length ? item.columnas_presentes : null,
    }
  })

  const { error: errorItems } = await supabase.from("factura_items").insert(itemsParaGuardar as never[])
  if (errorItems) {
    const { error: rollback } = await supabase.from("facturas").delete().eq("id", factura.id)
    if (rollback) throw new Error(`Error guardando items: ${errorItems.message}. No se pudo eliminar la factura incompleta: ${rollback.message}`)
    throw new Error(`Error guardando items: ${errorItems.message}`)
  }

  for (const item of itemsParaGuardar) {
    if (!item.producto_id || item.es_ajuste_negativo) continue
    const costoReal = item.cantidad > 0 ? numero(item.subtotal_neto) / item.cantidad : numero(item.precio_neto_unitario)
    const { data: productoActual } = await supabase.from("productos").select("costo_actual").eq("id", item.producto_id).single()
    await supabase.from("productos").update({ ultimo_costo: productoActual?.costo_actual ?? null, costo_actual: redondear(costoReal) }).eq("id", item.producto_id)
  }

  if (formData.get("pagar_al_cargar") === "1") {
    await registrarPago(supabase, { tipo: "factura", comprobanteId: factura.id, monto: total, formaPagoId: (formData.get("pago_forma_pago_id") as string) || null, fecha: formData.get("pago_fecha") as string })
    revalidatePath("/pagos"); revalidatePath("/dashboard")
  }

  revalidatePath("/facturas"); revalidatePath("/productos")
  redirect(`/facturas/${factura.id}`)
}

export async function crearProductoDesdeFactura(formData: FormData) {
  const supabase = await createClient()
  const nombre = String(formData.get("nombre") ?? "").trim()
  const costo = Number(formData.get("costo") ?? 0)
  if (!nombre) return { ok: false, error: "El nombre del producto es obligatorio." }
  const { data: existente } = await supabase.from("productos").select("id, nombre, codigo").ilike("nombre", nombre).maybeSingle()
  if (existente) return { ok: false, error: "Ya existe un producto con ese nombre.", producto: existente }
  const { data: producto, error } = await supabase.from("productos").insert({ nombre, costo_actual: costo, precio_venta: 0, activo: true }).select("id, nombre, codigo").single()
  if (error || !producto) return { ok: false, error: error?.message ?? "No fue posible crear el producto." }
  revalidatePath("/productos")
  return { ok: true, producto }
}
