'use server'

import { createClient } from "@/lib/supabase/server"
import { registrarPago } from "@/lib/pagos"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

type ItemInput = {
  producto_id: string
  cantidad: number
  precio_unitario: number
  descuento?: number
  bonificacion_importe?: number
  precio_final?: number
  porcentaje_descuento?: number | null
  bonificacion_tipo?: string | null
  cantidad_bonificada?: number | null
}

const EMPRESA_COOKIE = "factura_ia_empresa_activa"

export async function crearRemito(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const cookieStore = await cookies()
  let empresaId = cookieStore.get(EMPRESA_COOKIE)?.value ?? null
  if (!empresaId) {
    const { data: primerAcceso } = await supabase
      .from("usuario_empresa")
      .select("empresa_id")
      .eq("usuario_id", user.id)
      .eq("activo", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()
    empresaId = primerAcceso?.empresa_id ?? null
  }
  if (!empresaId) throw new Error("No hay una empresa activa configurada para este usuario.")

  const { data: accesoEmpresa } = await supabase
    .from("usuario_empresa")
    .select("empresa_id")
    .eq("usuario_id", user.id)
    .eq("empresa_id", empresaId)
    .eq("activo", true)
    .maybeSingle()
  if (!accesoEmpresa) throw new Error("No tenés acceso a la empresa seleccionada.")

  const itemsRaw = formData.get("items") as string
  const items: ItemInput[] = JSON.parse(itemsRaw || "[]")

  if (items.length === 0) throw new Error("El remito necesita al menos una línea de producto")
  if (items.some((item) => !item.producto_id)) throw new Error("Todas las líneas del remito deben tener un producto seleccionado")

  const itemsProcesados = items.map((item) => {
    const cantidad = Math.max(0, Number(item.cantidad ?? 0))
    const precioUnitario = Math.max(0, Number(item.precio_unitario ?? 0))
    const bruto = cantidad * precioUnitario
    const porcentaje = Math.min(100, Math.max(0, Number(item.descuento ?? 0)))
    const descuentoImporte = bruto * (porcentaje / 100)
    const bonificacion = Math.max(0, Number(item.bonificacion_importe ?? 0))
    const neto = Math.max(0, bruto - descuentoImporte - bonificacion)

    return {
      ...item,
      cantidad,
      precio_unitario: precioUnitario,
      precio_bruto_unitario: precioUnitario,
      descuento_importe: descuentoImporte,
      bonificacion_importe: bonificacion,
      precio_neto_unitario: cantidad > 0 ? neto / cantidad : 0,
      subtotal_neto: neto,
      precio_final: neto,
      porcentaje_descuento: porcentaje,
    }
  })

  const total = itemsProcesados.reduce((acumulado, item) => acumulado + item.subtotal_neto, 0)

  const { data: remito, error: errorRemito } = await supabase
    .from("remitos")
    .insert({
      numero: (formData.get("numero") as string) || null,
      fecha: formData.get("fecha") as string,
      fecha_vencimiento: (formData.get("fecha_vencimiento") as string) || null,
      proveedor_id: formData.get("proveedor_id") as string,
      empresa_id: empresaId,
      monto_total: total,
    })
    .select("id")
    .single()

  if (errorRemito || !remito) throw new Error(`Error creando remito: ${errorRemito?.message}`)

  const itemsParaGuardar = itemsProcesados.map((item) => ({
    remito_id: remito.id,
    producto_id: item.producto_id,
    cantidad: item.cantidad,
    precio_unitario: item.precio_unitario,
    descuento: item.descuento_importe,
    precio_final: item.precio_final,
    precio_bruto_unitario: item.precio_bruto_unitario,
    descuento_importe: item.descuento_importe,
    bonificacion_importe: item.bonificacion_importe,
    precio_neto_unitario: item.precio_neto_unitario,
    subtotal_neto: item.subtotal_neto,
    descuentos_detalle: item.porcentaje_descuento
      ? { porcentaje: item.porcentaje_descuento }
      : null,
    bonificacion_tipo: item.bonificacion_tipo ?? null,
    cantidad_bonificada: item.cantidad_bonificada ?? null,
  }))

  const { error: errorItems } = await supabase
    .from("remito_items")
    .insert(itemsParaGuardar as never)

  if (errorItems) {
    const { error: rollback } = await supabase.from("remitos").delete().eq("id", remito.id)
    if (rollback) throw new Error(`Error guardando items: ${errorItems.message}. No se pudo eliminar el remito incompleto: ${rollback.message}`)
    throw new Error(`Error guardando items: ${errorItems.message}`)
  }

  for (const item of itemsProcesados) {
    const { data: productoActual } = await supabase
      .from("productos")
      .select("costo_actual")
      .eq("id", item.producto_id)
      .single()

    await supabase
      .from("productos")
      .update({
        ultimo_costo: productoActual?.costo_actual ?? null,
        costo_actual: item.precio_neto_unitario,
      })
      .eq("id", item.producto_id)
  }

  const pagarAlCargar = formData.get("pagar_al_cargar") === "1"
  if (pagarAlCargar) {
    const montoPago = Number(formData.get("pago_monto"))
    const formaPagoId = (formData.get("pago_forma_pago_id") as string) || null
    const fechaPago = formData.get("pago_fecha") as string

    await registrarPago(supabase, {
      tipo: "remito",
      comprobanteId: remito.id,
      monto: montoPago,
      formaPagoId,
      fecha: fechaPago,
    })

    revalidatePath("/pagos")
    revalidatePath("/dashboard")
  }

  revalidatePath("/remitos")
  revalidatePath("/productos")
  redirect(`/remitos/${remito.id}/confirmacion`)
}

export async function crearProductoDesdeRemito(formData: FormData) {
  const supabase = await createClient()
  const nombre = String(formData.get("nombre") ?? "").trim()
  const costo = Number(formData.get("costo") ?? 0)

  if (!nombre) return { ok: false, error: "El nombre del producto es obligatorio." }
  if (!Number.isFinite(costo) || costo < 0) return { ok: false, error: "El costo del producto no es válido." }

  const { data: existente } = await supabase
    .from("productos")
    .select("id, nombre, codigo")
    .ilike("nombre", nombre)
    .maybeSingle()

  if (existente) {
    return { ok: false, error: "Ya existe un producto con ese nombre.", producto: existente }
  }

  const { data: producto, error } = await supabase
    .from("productos")
    .insert({
      nombre,
      costo_actual: costo,
      precio_venta: 0,
      activo: true,
    })
    .select("id, nombre, codigo")
    .single()

  if (error || !producto) {
    return { ok: false, error: error?.message ?? "No fue posible crear el producto." }
  }

  revalidatePath("/productos")
  return { ok: true, producto }
}
