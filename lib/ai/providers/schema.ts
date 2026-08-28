import { Type } from "@google/genai"

const cargoSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      descripcion: { type: Type.STRING },
      importe: { type: Type.NUMBER },
    },
    required: ["descripcion", "importe"],
  },
}

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
    impuestos_internos_total: { type: Type.NUMBER, nullable: true },
    percepciones: cargoSchema,
    otros_cargos: cargoSchema,
    // Compatibilidad con el formulario actual: contiene percepciones,
    // impuestos internos y otros cargos que deben sumarse al total.
    cargos: cargoSchema,
    total: { type: Type.NUMBER, nullable: true },
    lineas: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          descripcion: { type: Type.STRING },
          codigo_proveedor: { type: Type.STRING, nullable: true },
          cantidad: { type: Type.NUMBER },
          cantidad_bonificada: { type: Type.NUMBER, nullable: true },
          cantidad_bonificada_detalle: { type: Type.NUMBER, nullable: true },
          precio_unitario: { type: Type.NUMBER },
          precio_bruto_unitario: { type: Type.NUMBER, nullable: true },
          precio_neto: { type: Type.NUMBER, nullable: true },
          precio_neto_unitario: { type: Type.NUMBER, nullable: true },
          subtotal_neto: { type: Type.NUMBER, nullable: true },
          precio_final: { type: Type.NUMBER, nullable: true },
          iva: { type: Type.NUMBER, nullable: true },
          iva_importe: { type: Type.NUMBER, nullable: true },
          impuestos_internos: { type: Type.NUMBER, nullable: true },
          descuento: { type: Type.NUMBER, nullable: true },
          porcentaje_descuento: { type: Type.NUMBER, nullable: true },
          tipo_descuento: { type: Type.STRING, nullable: true },
          tipo_linea: { type: Type.STRING, nullable: true },
          es_ajuste_negativo: { type: Type.BOOLEAN, nullable: true },
          descuentos: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                porcentaje: { type: Type.NUMBER, nullable: true },
                importe: { type: Type.NUMBER, nullable: true },
                descripcion: { type: Type.STRING, nullable: true },
              },
            },
          },
          grupo_descuento: { type: Type.STRING, nullable: true },
          bonificacion: { type: Type.NUMBER, nullable: true },
          bonificacion_importe: { type: Type.NUMBER, nullable: true },
          bonificacion_tipo: { type: Type.STRING, nullable: true },
          tipo_bonificacion: { type: Type.STRING, nullable: true },
        },
        required: ["descripcion", "cantidad", "precio_unitario"],
      },
    },
  },
  required: ["lineas", "cargos"],
}
