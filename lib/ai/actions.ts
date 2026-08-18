"use server"

import { createClient } from "@/lib/supabase/server"

import { extraerComprobante } from "./extraer-comprobante"
import { procesarLineasIA } from "./matching/procesarLineasIA"

import type {
  ComprobanteExtraido,
} from "./tipos"

export async function leerFacturaConIA(
  base64: string,
  mimeType: string
): Promise<ComprobanteExtraido> {

  return extraerComprobante(
    base64,
    mimeType,
    "factura"
  )
}

export async function leerRemitoConIA(
  base64: string,
  mimeType: string
): Promise<ComprobanteExtraido> {

  return extraerComprobante(
    base64,
    mimeType,
    "remito"
  )
}

export async function procesarLineasFacturaConIA(
  proveedorId: string,
  lineas: ComprobanteExtraido["lineas"],
  productos: {
    id: string
    nombre: string
  }[]
) {

  if (!proveedorId) {
    throw new Error(
      "No se puede procesar la factura sin proveedor."
    )
  }

  const supabase = await createClient()

  return procesarLineasIA(
    supabase,
    proveedorId,
    lineas,
    productos
  )
}