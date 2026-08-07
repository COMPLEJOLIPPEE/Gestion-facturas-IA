export type LineaExtraida = {
  descripcion: string

  cantidad: number

  precio_unitario: number

  iva: number | null

  // ===== Motor de Costos =====

  descuento?: number | null

  precio_final?: number | null

  // ===== Datos del proveedor =====

  codigo_proveedor?: string | null

  // ===== Resultado del matching =====

  producto_id?: string

  score?: number

  confianza?: "alta" | "media" | "baja"

  motivo?: string

  fuente?: "alias" | "smartmatch" | "manual"
}

export type ComprobanteExtraido = {
  proveedor_nombre: string | null

  numero: string | null

  fecha: string | null

  fecha_vencimiento: string | null

  total: number | null

  lineas: LineaExtraida[]
}

export type TipoComprobanteIA = "factura" | "remito"