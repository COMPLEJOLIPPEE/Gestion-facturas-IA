export type TipoLineaIA =
  | "producto"
  | "descuento_linea"
  | "descuento_agrupado"

export type LineaExtraida = {
  descripcion: string

  cantidad: number

  precio_unitario: number

  iva: number | null

  // Tipo de línea detectada por la IA
  tipo_linea?: TipoLineaIA

  // Código informado por el proveedor
  codigo_proveedor?: string | null

  // Descuento aplicado directamente a esta línea
  descuento?: number | null

  // Precio final luego del descuento
  precio_final?: number | null

  // Porcentaje de descuento cuando pueda identificarse
  porcentaje_descuento?: number | null

  // Identificador/grupo del descuento agrupado
  grupo_descuento?: string | null

  // Descripciones de los productos a los que corresponde
  aplica_a_descripciones?: string[]

  // Resultado del matching
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

  // Importe antes de descuentos
  subtotal_bruto: number | null

  // Total de descuentos
  descuento_total: number | null

  // Importe después de descuentos y antes de impuestos
  subtotal_neto: number | null

  // IVA total
  iva_total: number | null

  // Otros impuestos, percepciones y cargos
  cargos: CargoExtraido[]

  // Total final del comprobante
  total: number | null

  lineas: LineaExtraida[]
}

export type TipoComprobanteIA =
  | "factura"
  | "remito"