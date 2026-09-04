export type TipoLineaIA = "producto" | "descuento_linea" | "descuento_agrupado" | "ajuste"

export type CargoExtraido = { descripcion: string; importe: number }

export type LineaExtraida = {
  descripcion: string
  cantidad: number
  precio_unitario: number
  iva: number | null
  tipo_linea?: TipoLineaIA
  es_ajuste_negativo?: boolean
  codigo_proveedor?: string | null
  descuento?: number | null
  porcentaje_descuento?: number | null
  tipo_descuento?: string | null
  descuentos?: { porcentaje?: number | null; importe?: number | null; descripcion?: string | null }[]
  bonificacion?: number | null
  bonificacion_importe?: number | null
  bonificacion_tipo?: string | null
  tipo_bonificacion?: string | null
  cantidad_bonificada?: number | null
  cantidad_bonificada_detalle?: number | null
  precio_bruto_unitario?: number | null
  precio_neto?: number | null
  precio_neto_unitario?: number | null
  subtotal_neto?: number | null
  precio_final?: number | null
  iva_importe?: number | null
  impuestos_internos?: number | null
  cargos?: CargoExtraido[]
  grupo_descuento?: string | null
  aplica_a_descripciones?: string[]
  columnas_presentes?: string[]
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
  subtotal_bruto: number | null
  descuento_total: number | null
  subtotal_neto: number | null
  iva_total: number | null
  impuestos_internos_total: number | null
  percepciones: CargoExtraido[]
  otros_cargos: CargoExtraido[]
  cargos: CargoExtraido[]
  total: number | null
  lineas: LineaExtraida[]
}

export type TipoComprobanteIA = "factura" | "remito"
