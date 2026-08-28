'use server'

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
  cantidad_bonificada?: number | null
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
  cantidad_bonificada_detalle?: number | null
  impuestos_internos?: number | null
}

function numero(valor: unknown) {
  const resultado = Number(valor ?? 0)
  return Number.isFinite(resultado) ? resultado : 0
}
function redondear(valor: number) { return Number(valor.toFixed(2)) }
const EMPRESA_COOKIE = "factura_ia_empresa_activa"

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
  if (!items.length) throw new Error("La factura necesita al menos una línea de producto")
  if (items.some((item) => !item.producto_id)) throw new Error("Todas las líneas deben tener un producto seleccionado")

  let cargos: CargoInput[] = []
  try {
    cargos = JSON.parse(String(formData.get("cargos") ?? "[]"))
  } catch {
    throw new Error("Los cargos de la factura no tienen un formato válido.")
  }
  const totalCargos = cargos.reduce((acc, cargo) => acc + numero(cargo.importe), 0)

  const resumen = items.reduce((acc, item) => {
    const cantidad = Math.max(0, numero(item.cantidad))
    const precioUnitario = numero(item.precio_unitario)
    const bruto = cantidad * precioUnitario
    const esAjusteNegativo = bruto < 0
    const descuento = esAjusteNegativo ? 0 : Math.abs(numero(item.descuento))
    const bonificacion = esAjusteNegativo ? 0 : Math.abs(numero(item.bonificacion))
    const cantidadBonificada = Math.min(Math.max(0, numero(item.cantidad_bonificada ?? item.cantidad_bonificada_detalle)), cantidad)
    const porCantidad = item.tipo_bonificacion === "cantidad"
    const bonificacionImporte = porCantidad ? cantidadBonificada * Math.abs(precioUnitario) : bonificacion
    const subtotalNeto = esAjusteNegativo ? bruto : Math.max(0, bruto - descuento - bonificacionImporte)
    const ivaImporte = numero(item.iva_importe) !== 0 ? numero(item.iva_importe) : subtotalNeto * (numero(item.iva) / 100)
    acc.subtotalBruto += bruto
    acc.descuentos += esAjusteNegativo ? Math.abs(bruto) : descuento + bonificacionImporte
    acc.subtotalNeto += subtotalNeto
    acc.iva += ivaImporte
    acc.impuestosInternos += numero(item.impuestos_internos)
    return acc
  }, { subtotalBruto: 0, descuentos: 0, subtotalNeto: 0, iva: 0, impuestosInternos: 0 })

  const subtotal = redondear(resumen.subtotalNeto)
  const iva = redondear(resumen.iva)
  const impuestosInternos = redondear(resumen.impuestosInternos)
  const total = redondear(subtotal + iva + impuestosInternos + totalCargos)

  const { data: factura, error: errorFactura } = await supabase.from("facturas").insert({
    numero: (formData.get("numero") as string) || null,
    fecha: formData.get("fecha") as string,
    fecha_vencimiento: (formData.get("fecha_vencimiento") as string) || null,
    proveedor_id: formData.get("proveedor_id") as string,
    empresa_id: empresaId,
    subtotal,
    descuento_total: redondear(resumen.descuentos),
    iva,
    impuestos_internos: impuestosInternos,
    otros_cargos: redondear(totalCargos),
    total,
    estado: "pendiente",
  }).select("id").single()

  if (errorFactura || !factura) throw new Error(`Error creando factura: ${errorFactura?.message}`)

  const itemsParaGuardar = items.map((item) => {
    const cantidad = Math.max(0, numero(item.cantidad))
    const brutoUnitario = numero(item.precio_unitario)
    const bruto = cantidad * brutoUnitario
    const esAjusteNegativo = bruto < 0
    const descuento = esAjusteNegativo ? 0 : Math.abs(numero(item.descuento))
    const bonificacion = esAjusteNegativo ? 0 : Math.abs(numero(item.bonificacion))
    const cantidadBonificada = Math.min(Math.max(0, numero(item.cantidad_bonificada ?? item.cantidad_bonificada_detalle)), cantidad)
    const porCantidad = item.tipo_bonificacion === "cantidad"
    const bonificacionImporte = porCantidad ? cantidadBonificada * Math.abs(brutoUnitario) : bonificacion
    const subtotalNeto = esAjusteNegativo ? bruto : Math.max(0, bruto - descuento - bonificacionImporte)
    const precioNetoUnitario = cantidad > 0 ? subtotalNeto / cantidad : brutoUnitario
    const ivaImporte = numero(item.iva_importe) !== 0 ? numero(item.iva_importe) : subtotalNeto * (numero(item.iva) / 100)
    const impuestosInternos = numero(item.impuestos_internos)
    const descuentosDetalle = [...(item.descuentos ?? []), ...(item.grupo_descuento ? [{ descripcion: item.grupo_descuento, importe: descuento }] : [])]

    return {
      factura_id: factura.id,
      producto_id: item.producto_id,
      cantidad,
      precio_unitario: brutoUnitario,
      iva: numero(item.iva),
      "alicuota IVA": numero(item.iva),
      descuento,
      precio_final: redondear(precioNetoUnitario),
      precio_bruto_unitario: redondear(brutoUnitario),
      descuento_importe: redondear(descuento),
      bonificacion_importe: redondear(bonificacionImporte),
      precio_neto_unitario: redondear(precioNetoUnitario),
      subtotal_neto: redondear(subtotalNeto),
      iva_importe: redondear(ivaImporte),
      impuestos_internos: redondear(impuestosInternos),
      descuentos_detalle: descuentosDetalle.length ? descuentosDetalle : null,
      bonificacion_tipo: item.tipo_bonificacion ?? null,
      cantidad_bonificada: cantidadBonificada || null,
    }
  })

  const { error: errorItems } = await supabase.from("factura_items").insert(itemsParaGuardar as never[])
  if (errorItems) {
    const { error: rollback } = await supabase.from("facturas").delete().eq("id", factura.id)
    if (rollback) throw new Error(`Error guardando items: ${errorItems.message}. No se pudo eliminar la factura incompleta: ${rollback.message}`)
    throw new Error(`Error guardando items: ${errorItems.message}`)
  }

  for (const item of itemsParaGuardar) {
    const costoReal = item.cantidad > 0 ? numero(item.subtotal_neto) / item.cantidad : numero(item.precio_neto_unitario)
    const { data: productoActual } = await supabase.from("productos").select("costo_actual").eq("id", item.producto_id).single()
    await supabase.from("productos").update({ ultimo_costo: productoActual?.costo_actual ?? null, costo_actual: redondear(costoReal) }).eq("id", item.producto_id)
  }

  if (formData.get("pagar_al_cargar") === "1") {
    await registrarPago(supabase, { tipo: "factura", comprobanteId: factura.id, monto: Number(formData.get("pago_monto")), formaPagoId: (formData.get("pago_forma_pago_id") as string) || null, fecha: formData.get("pago_fecha") as string })
    revalidatePath("/pagos")
    revalidatePath("/dashboard")
  }

  revalidatePath("/facturas")
  revalidatePath("/productos")
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
