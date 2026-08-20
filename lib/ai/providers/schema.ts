import { Type } from "@google/genai"

export const schema = {
  type: Type.OBJECT,
  properties: {
    proveedor_nombre: { type: Type.STRING, nullable: true },
    numero: { type: Type.STRING, nullable: true },
    fecha: { type: Type.STRING, nullable: true },
    fecha_vencimiento: { type: Type.STRING, nullable: true },

    subtotal_bruto: { type: Type.NUMBER, nullable: true },
    descuento_total: { type: Type.NUMBER, nullable: true },
    subtotal_neto: { type: Type.NUMBER, nullable: true },
    iva_total: { type: Type.NUMBER, nullable: true },

    cargos: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          descripcion: { type: Type.STRING },
          importe: { type: Type.NUMBER },
        },
        required: ["descripcion", "importe"],
      },
    },

    total: { type: Type.NUMBER, nullable: true },

    lineas: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          descripcion: { type: Type.STRING },
          codigo_proveedor: { type: Type.STRING, nullable: true },
          cantidad: { type: Type.NUMBER },

          // Precio informado en la columna de precio unitario del comprobante.
          precio_unitario: { type: Type.NUMBER },

          // Facturas: IVA informado por la línea. Remitos: debe ser null.
          iva: { type: Type.NUMBER, nullable: true },

          // Descuento monetario aplicado a la línea.
          descuento: { type: Type.NUMBER, nullable: true },
          porcentaje_descuento: { type: Type.NUMBER, nullable: true },

          // Bonificaciones comerciales, por ejemplo 3x2 o 5x4.
          bonificacion_importe: { type: Type.NUMBER, nullable: true },
          bonificacion_tipo: { type: Type.STRING, nullable: true },
          cantidad_bonificada: { type: Type.NUMBER, nullable: true },

          precio_bruto_unitario: { type: Type.NUMBER, nullable: true },
          precio_neto_unitario: { type: Type.NUMBER, nullable: true },
          subtotal_neto: { type: Type.NUMBER, nullable: true },
          precio_final: { type: Type.NUMBER, nullable: true },
        },
        required: ["descripcion", "cantidad", "precio_unitario"],
      },
    },
  },
  required: ["lineas"],
}
