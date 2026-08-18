import { Type } from "@google/genai"

export const schema = {
  type: Type.OBJECT,

  properties: {
    proveedor_nombre: {
      type: Type.STRING,
      nullable: true,
    },

    numero: {
      type: Type.STRING,
      nullable: true,
    },

    fecha: {
      type: Type.STRING,
      nullable: true,
    },

    fecha_vencimiento: {
      type: Type.STRING,
      nullable: true,
    },

    subtotal_bruto: {
      type: Type.NUMBER,
      nullable: true,
    },

    descuento_total: {
      type: Type.NUMBER,
      nullable: true,
    },

    subtotal_neto: {
      type: Type.NUMBER,
      nullable: true,
    },

    iva_total: {
      type: Type.NUMBER,
      nullable: true,
    },

    cargos: {
      type: Type.ARRAY,

      items: {
        type: Type.OBJECT,

        properties: {
          descripcion: {
            type: Type.STRING,
          },

          importe: {
            type: Type.NUMBER,
          },
        },

        required: [
          "descripcion",
          "importe",
        ],
      },
    },

    total: {
      type: Type.NUMBER,
      nullable: true,
    },

    lineas: {
      type: Type.ARRAY,

      items: {
        type: Type.OBJECT,

        properties: {
          descripcion: {
            type: Type.STRING,
          },

          codigo_proveedor: {
            type: Type.STRING,
            nullable: true,
          },

          cantidad: {
            type: Type.NUMBER,
          },

          precio_unitario: {
            type: Type.NUMBER,
          },

          iva: {
            type: Type.NUMBER,
            nullable: true,
          },

          descuento: {
            type: Type.NUMBER,
            nullable: true,
          },

          precio_final: {
            type: Type.NUMBER,
            nullable: true,
          },
        },

        required: [
          "descripcion",
          "cantidad",
          "precio_unitario",
        ],
      },
    },
  },

  required: [
    "lineas",
  ],
}