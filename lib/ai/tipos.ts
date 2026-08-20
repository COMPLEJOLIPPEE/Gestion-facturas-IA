export type TipoLineaIA =
  | "producto"
  | "descuento_linea"
  | "descuento_agrupado"

export type LineaExtraida = {
  descripcion: string
  cantidad: number
  precio_unitario: number
  iva: number | null

  tipo_linea?: TipoLineaIA
  codigo_proveedor?: string | null

  descuento?: number | null
  porcentaje_descuento?: number | null

  // Bonificación comercial: 3x2, 5x4, unidades bonificadas, etc.
  bonificacion_importe?: number | null
  bonificacion_tipo?: string | null
  cantidad_bonificada?: number | null

  precio_bruto_unitario?: number | null
  precio_neto_unitario?: number | null
  subtotal_neto?: number | null
  precio_final?: number | null

  grupo_descuento?: string | null
  aplica_a_descripciones?: string[]

  producto_id?: string
  score?: number
  confianza?: "alta" | "media" | "baja"
  motivo?: string
  fuente?: "alias" | "smartmatch" | "manual"
}

export type CargoExtraido = {
  descripcion: string
  importe: number
}

export type ComprobanteExtraido = {
  proveedor_nombre: string | null
  numero: string | null
  fecha: string | null
  fecha_vencimiento: string | null

  subtotal_bruto: number | null
  descuento_total: number | null
  subtotal_neto: number | null
  iva_total: number | null
  cargos: CargoExtraido[]
  total: number | null
  lineas: LineaExtraida[]
}

export type TipoComprobanteIA =
  | "factura"
  | "remito"
