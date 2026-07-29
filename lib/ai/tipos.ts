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

export type TipoComprobanteIA = "factura" | "remito"
