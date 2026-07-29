"use server"

import { extraerComprobante } from "./extraer-comprobante"

export async function leerFacturaConIA(base64: string, mimeType: string): Promise<ComprobanteExtraido> {
  return extraerComprobante(base64, mimeType, "factura")
}

export async function leerRemitoConIA(base64: string, mimeType: string): Promise<ComprobanteExtraido> {
  return extraerComprobante(base64, mimeType, "remito")
}
export type LineaExtraida = {
  descripcion: string
  cantidad: number
  precio_unitario: number
  iva: number | null
}

export type ComprobanteExtraido = {
  proveedor_nombre: string | null
  numero: string | null
  fecha: string | null
  fecha_vencimiento: string | null
  total: number | null
  lineas: LineaExtraida[]
}
