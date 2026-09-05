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
  precio_bruto_unitario?: number | null
  precio_neto?: number | null
  precio_neto_unitario?: number | null
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

function numero(valor: unknown) {
  const resultado = Number(valor ?? 0)
  return Number.isFinite(resultado) ? resultado : 0
}

function redondear(valor: number) {
  return Number(valor.toFixed(2))
}

const EMPRESA_COOKIE = "factura_ia_empresa_activa"

function calcularControlLinea(item: ItemInput) {
  const cantidad = Math.max(0, numero(item.cantidad))
  const precioUnitario = numero(item.precio_unitario)
  const subtotalExplicito = item.subtotal_neto != null ? numero(item.subtotal_neto) : null
  const ivaExplicito = item.iva_importe != null ? numero(item.iva_importe) : null
  const ajuste = item.tipo_linea === "ajuste" || item.es_ajuste_negativo === true
  const subtotal = subtotalExplicito ?? (ajuste ? -Math.abs(cantidad * precioUnitario) : Math.max(0, cantidad * Math.abs(precioUnitario)))
  const iva = ivaExplicito ?? 0
  const internos = numero(item.impuestos_internos)
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

  const oficial = (nombre: string) => {
    const valor = formData.get(nombre)
    return valor === null || valor === "" ? null : numero(valor)
  }

  const oficialSubtotalBruto = oficial("ia_subtotal_bruto")
  const oficialDescuentoTotal = oficial("ia_descuento_total")
  const oficialSubtotal = oficial("ia_subtotal_neto")
  const oficialIva = oficial("ia_iva_total")
  const oficialInternos = oficial("ia_impuestos_internos_total")
  const oficialTotal = oficial("ia_total")

  const subtotal = oficialSubtotal !== null ? redondear(oficialSubtotal) : subtotalControl
  const iva = oficialIva !== null ? redondear(oficialIva) : ivaControl
  const total = oficialTotal !== null ? redondear(oficialTotal) : totalControl
  const impuestosInternos = oficialInternos !== null ? redondear(oficialInternos) : internosControl
  const otrosCargos = cargosControl
  const descuentoTotal = oficialDescuentoTotal !== null ? redondear(oficialDescuentoTotal) : 0
  const subtotalBruto = oficialSubtotalBruto !== null ? redondear(oficialSubtotalBruto) : 0

  const { data: factura, error: errorFactura } = await supabase.from("facturas").insert({
    numero: (formData.get("numero") as string) || null,
    fecha: formData.get("fecha") as string,
    fecha_vencimiento: (formData.get("fecha_vencimiento") as string) || null,
    proveedor_id: formData.get("proveedor_id") as string,
    empresa_id: empresaId,
    subtotal,
    subtotal_bruto: subtotalBruto,
    descuento_total: descuentoTotal,
    iva,
    impuestos_internos: impuestosInternos,
    otros_cargos: otrosCargos,
    total,
    estado: "pendiente",
  }).select("id").single()
  if (errorFactura || !factura) throw new Error(`Error creando factura: ${errorFactura?.message}`)

  const itemsParaGuardar = items.map((item) => {
    const l = calcularControlLinea(item)
    const esPorcentaje = item.tipo_descuento === "porcentaje"
    const bonificacionEsPorcentaje = item.tipo_bonificacion === "porcentaje"
    const descuentosDetalle: DescuentoDetalle[] = [...(item.descuentos ?? [])]
    if (item.descuento_porcentaje != null) descuentosDetalle.push({ descripcion: "Descuento porcentual", porcentaje: Math.abs(numero(item.descuento_porcentaje)), importe: null })
    if (item.grupo_descuento) descuentosDetalle.push({ descripcion: item.grupo_descuento, importe: Math.abs(numero(item.descuento)) || null })

    return {
      factura_id: factura.id,
      producto_id: l.ajuste ? null : item.producto_id,
      descripcion: item.descripcionLeida ?? null,
      tipo_linea: l.ajuste ? "ajuste" : "producto",
      es_ajuste_negativo: item.es_ajuste_negativo === true,
      cantidad: numero(item.cantidad),
      precio_unitario: numero(item.precio_unitario),
      iva: numero(item.iva),
      "alicuota IVA": numero(item.iva),
      descuento: numero(item.descuento),
      descuento_importe: esPorcentaje ? null : numero(item.descuento),
      precio_final: item.precio_final != null ? numero(item.precio_final) : null,
      precio_bruto_unitario: item.precio_bruto_unitario != null ? numero(item.precio_bruto_unitario) : null,
      bonificacion_importe: bonificacionEsPorcentaje ? null : (item.bonificacion != null ? numero(item.bonificacion) : null),
      precio_neto_unitario: item.precio_neto_unitario != null ? numero(item.precio_neto_unitario) : null,
      subtotal_neto: item.subtotal_neto != null ? numero(item.subtotal_neto) : null,
      importe_linea: item.importe_linea != null ? numero(item.importe_linea) : null,
      iva_importe: item.iva_importe != null ? numero(item.iva_importe) : null,
      impuestos_internos: item.impuestos_internos != null ? numero(item.impuestos_internos) : null,
      descuentos_detalle: descuentosDetalle.length ? descuentosDetalle : null,
      bonificacion_tipo: item.tipo_bonificacion ?? null,
      cantidad_bonificada: item.cantidad_bonificada ?? item.cantidad_bonificada_detalle ?? null,
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

  // ÚNICO cálculo de costo de producto: importe total de la línea / cantidad.
  // Si la factura no imprimió importe_linea, no inventamos un costo.
  for (let index = 0; index < items.length; index++) {
    const item = items[index]
    if (!item || !item.producto_id || item.es_ajuste_negativo || item.tipo_linea === "ajuste") continue

    const importeLinea = item.importe_linea
    const cantidad = numero(item.cantidad)
    if (importeLinea == null || cantidad <= 0) continue

    const costoReal = numero(importeLinea) / cantidad
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
