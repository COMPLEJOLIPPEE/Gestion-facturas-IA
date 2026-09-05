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
  importe_linea?: number | null
  iva: number
  iva_importe?: number | null
  descuento?: number
  descuento_porcentaje?: number | null
  tipo_descuento?: "porcentaje" | "importe" | null
  descuentos?: DescuentoDetalle[]
  grupo_descuento?: string | null
  bonificacion?: number | null
  bonificacion_porcentaje?: number | null
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
const EMPRESA_COOKIE = "factura_ia_empresa_activa"

function calcularControlLinea(item: ItemInput) {
  const cantidad = Math.max(0, numero(item.cantidad))
  const precioUnitario = numero(item.precio_unitario)
  const subtotalExplicito = item.subtotal_neto != null && Number.isFinite(Number(item.subtotal_neto)) ? numero(item.subtotal_neto) : null
  const ivaExplicito = item.iva_importe != null && Number.isFinite(Number(item.iva_importe)) ? numero(item.iva_importe) : null
  const ajuste = item.tipo_linea === "ajuste" || item.es_ajuste_negativo === true || precioUnitario < 0
  const subtotal = subtotalExplicito ?? (ajuste ? -Math.abs(cantidad * precioUnitario) : Math.max(0, cantidad * Math.abs(precioUnitario)))
  const iva = ivaExplicito ?? 0
  const internos = ajuste ? -Math.abs(numero(item.impuestos_internos)) : Math.abs(numero(item.impuestos_internos))
  return { cantidad, precioUnitario, subtotal, iva, internos, ajuste }
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

  const controles = items.map(calcularControlLinea)
  const subtotalControl = redondear(controles.reduce((s, l) => s + l.subtotal, 0))
  const ivaControl = redondear(controles.reduce((s, l) => s + l.iva, 0))
  const internosControl = redondear(controles.reduce((s, l) => s + l.internos, 0))
  const cargosControl = redondear(cargos.reduce((s, c) => s + numero(c.importe), 0))
  const totalControl = redondear(subtotalControl + ivaControl + internosControl + cargosControl)

  const iaSubtotal = formData.get("ia_subtotal_neto")
  const iaIva = formData.get("ia_iva_total")
  const iaTotal = formData.get("ia_total")
  const oficialSubtotal = iaSubtotal === null || iaSubtotal === "" ? null : numero(iaSubtotal)
  const oficialIva = iaIva === null || iaIva === "" ? null : numero(iaIva)
  const oficialTotal = iaTotal === null || iaTotal === "" ? null : numero(iaTotal)

  const subtotal = oficialSubtotal !== null ? redondear(oficialSubtotal) : subtotalControl
  const iva = oficialIva !== null ? redondear(oficialIva) : ivaControl
  const total = oficialTotal !== null ? redondear(oficialTotal) : totalControl
  const impuestosInternos = internosControl
  const otrosCargos = cargosControl
  const descuentoTotal = redondear(items.reduce((s, item) => s + Math.abs(numero(item.descuento)), 0) + items.reduce((s, item) => s + Math.abs(numero(item.bonificacion)), 0))
  const subtotalBruto = redondear(controles.reduce((s, l) => s + Math.abs(l.cantidad * l.precioUnitario), 0))

  const { data: factura, error: errorFactura } = await supabase.from("facturas").insert({ numero: (formData.get("numero") as string) || null, fecha: formData.get("fecha") as string, fecha_vencimiento: (formData.get("fecha_vencimiento") as string) || null, proveedor_id: formData.get("proveedor_id") as string, empresa_id: empresaId, subtotal, subtotal_bruto: subtotalBruto, descuento_total: descuentoTotal, iva, impuestos_internos: impuestosInternos, otros_cargos: otrosCargos, total, estado: "pendiente" }).select("id").single()
  if (errorFactura || !factura) throw new Error(`Error creando factura: ${errorFactura?.message}`)

  const itemsParaGuardar = items.map((item) => {
    const l = calcularControlLinea(item)
    const descuentosDetalle: DescuentoDetalle[] = [...(item.descuentos ?? [])]
    if (item.descuento_porcentaje != null) descuentosDetalle.push({ descripcion: "Descuento porcentual", porcentaje: Math.abs(numero(item.descuento_porcentaje)), importe: null })
    if (item.grupo_descuento) descuentosDetalle.push({ descripcion: item.grupo_descuento, importe: Math.abs(numero(item.descuento)) || null })
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
      descuento: redondear(l.ajuste ? 0 : Math.abs(numero(item.descuento))),
      precio_final: item.precio_final != null ? redondear(numero(item.precio_final)) : null,
      precio_bruto_unitario: item.precio_bruto_unitario != null ? redondear(l.ajuste ? -Math.abs(numero(item.precio_bruto_unitario)) : Math.abs(numero(item.precio_bruto_unitario))) : null,
      descuento_importe: redondear(l.ajuste ? 0 : Math.abs(numero(item.descuento))),
      bonificacion_importe: redondear(l.ajuste ? 0 : Math.abs(numero(item.bonificacion))),
      precio_neto_unitario: item.precio_neto_unitario != null ? redondear(numero(item.precio_neto_unitario)) : null,
      subtotal_neto: item.subtotal_neto != null ? redondear(l.ajuste ? -Math.abs(numero(item.subtotal_neto)) : Math.abs(numero(item.subtotal_neto))) : null,
      iva_importe: item.iva_importe != null ? redondear(l.ajuste ? -Math.abs(numero(item.iva_importe)) : Math.abs(numero(item.iva_importe))) : null,
      impuestos_internos: redondear(l.internos),
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
    const importeLinea = numero((items.find((original) => original.producto_id === item.producto_id && original.cantidad === item.cantidad)?.importe_linea))
    const subtotalNeto = numero(item.subtotal_neto)
    const ivaImporte = numero(item.iva_importe)
    const internos = numero(item.impuestos_internos)
    const totalProducto = importeLinea > 0 ? importeLinea : subtotalNeto + ivaImporte + internos
    const costoReal = item.cantidad > 0 ? totalProducto / item.cantidad : 0
    if (costoReal <= 0) continue
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
