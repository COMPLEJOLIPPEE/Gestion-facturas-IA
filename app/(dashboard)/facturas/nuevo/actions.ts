'use server'

import { createClient } from "@/lib/supabase/server"
import { registrarPago } from "@/lib/pagos"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

type ItemInput = {
  producto_id: string
  cantidad: number
  precio_unitario: number
  iva: number
  descuento?: number
  precio_final?: number
}

export async function crearFactura(formData: FormData) {

  const supabase = await createClient()

  const itemsRaw =
    formData.get("items") as string

  const items: ItemInput[] =
    JSON.parse(itemsRaw || "[]")

  if (items.length === 0) {
    throw new Error(
      "La factura necesita al menos una línea de producto"
    )
  }

  const subtotal =
    Number(formData.get("subtotal"))

  const iva =
    Number(formData.get("iva"))

  const total =
    Number(formData.get("total"))

  const { data: factura, error: errorFactura } =
    await supabase
      .from("facturas")
      .insert({
        numero:
          (formData.get("numero") as string) || null,

        fecha:
          formData.get("fecha") as string,

        fecha_vencimiento:
          (formData.get("fecha_vencimiento") as string) ||
          null,

        proveedor_id:
          formData.get("proveedor_id") as string,

        empresa_id:
          formData.get("empresa_id") as string,

        subtotal,

        iva,

        total,

        estado: "pendiente",
      })
      .select("id")
      .single()

  if (errorFactura || !factura) {
    throw new Error(
      `Error creando factura: ${errorFactura?.message}`
    )
  }

  const { error: errorItems } =
    await supabase
      .from("factura_items")
      .insert(
        items.map((item) => ({
          factura_id:
            factura.id,

          producto_id:
            item.producto_id,

          cantidad:
            item.cantidad,

          precio_unitario:
            item.precio_unitario,

          iva:
            item.iva,

          descuento:
            item.descuento ?? 0,

          precio_final:
            item.precio_final ??
            (
              item.cantidad *
              item.precio_unitario
            ),
        }))
      )

  if (errorItems) {
    throw new Error(
      `Error guardando items: ${errorItems.message}`
    )
  }

  // Actualizar costo real del producto
  for (const item of items) {

    if (!item.producto_id)
      continue

    const precioFinal =
      item.precio_final ??
      (
        item.cantidad *
        item.precio_unitario
      )

    const costoReal =
      item.cantidad > 0
        ? precioFinal / item.cantidad
        : item.precio_unitario

    const { data: productoActual } =
      await supabase
        .from("productos")
        .select("costo_actual")
        .eq("id", item.producto_id)
        .single()

    await supabase
      .from("productos")
      .update({
        ultimo_costo:
          productoActual?.costo_actual ?? null,

        costo_actual:
          costoReal,
      })
      .eq("id", item.producto_id)
  }

  const pagarAlCargar =
    formData.get("pagar_al_cargar") === "1"

  if (pagarAlCargar) {

    const montoPago =
      Number(formData.get("pago_monto"))

    const formaPagoId =
      (formData.get(
        "pago_forma_pago_id"
      ) as string) || null

    const fechaPago =
      formData.get("pago_fecha") as string

    await registrarPago(supabase, {
      tipo: "factura",
      comprobanteId: factura.id,
      monto: montoPago,
      formaPagoId,
      fecha: fechaPago,
    })

    revalidatePath("/pagos")
    revalidatePath("/dashboard")
  }

  revalidatePath("/facturas")
  revalidatePath("/productos")

  redirect(
    `/facturas/${factura.id}`
  )
}
export async function crearProductoDesdeFactura(formData: FormData) {
  const supabase = await createClient()

  const nombre = String(formData.get("nombre") ?? "").trim()
  const costo = Number(formData.get("costo") ?? 0)
  const iva = Number(formData.get("iva") ?? 21)

  if (!nombre) {
    return {
      ok: false,
      error: "El nombre del producto es obligatorio.",
    }
  }

  // Verificar si ya existe
  const { data: existente } = await supabase
    .from("productos")
    .select("id, nombre, codigo")
    .ilike("nombre", nombre)
    .maybeSingle()

  if (existente) {
    return {
      ok: false,
      error: "Ya existe un producto con ese nombre.",
      producto: existente,
    }
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
    return {
      ok: false,
      error: error?.message ?? "No fue posible crear el producto.",
    }
  }

  revalidatePath("/productos")

  return {
    ok: true,
    producto,
  }
}