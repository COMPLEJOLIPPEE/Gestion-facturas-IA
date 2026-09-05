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

const columnasSchema = {
  type: Type.ARRAY,
  items: { type: Type.STRING },
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
          importe_linea: { type: Type.NUMBER, nullable: true },
          precio_final: { type: Type.NUMBER, nullable: true },
          iva: { type: Type.NUMBER, nullable: true },
          iva_importe: { type: Type.NUMBER, nullable: true },
          impuestos_internos: { type: Type.NUMBER },
          descuento: { type: Type.NUMBER, nullable: true },
          porcentaje_descuento: { type: Type.NUMBER, nullable: true },
          tipo_descuento: { type: Type.STRING, nullable: true, enum: ["porcentaje", "importe"] },
          tipo_linea: { type: Type.STRING, enum: ["producto", "descuento_linea", "descuento_agrupado", "ajuste"] },
          es_ajuste_negativo: { type: Type.BOOLEAN },
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
          aplica_a_descripciones: { type: Type.ARRAY, items: { type: Type.STRING } },
          bonificacion: { type: Type.NUMBER, nullable: true },
          bonificacion_importe: { type: Type.NUMBER, nullable: true },
          bonificacion_tipo: { type: Type.STRING, nullable: true },
          tipo_bonificacion: { type: Type.STRING, nullable: true, enum: ["porcentaje", "cantidad", "importe"] },
          cargos: cargoSchema,
          columnas_presentes: columnasSchema,
        },
        required: ["descripcion", "cantidad", "precio_unitario", "impuestos_internos", "tipo_linea", "es_ajuste_negativo", "aplica_a_descripciones", "cargos", "columnas_presentes"],
      },
    },
  },
  required: ["lineas", "cargos"],
}
