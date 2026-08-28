import OpenAI from "openai";
import type {
  ComprobanteExtraido,
  TipoComprobanteIA,
} from "../tipos";

const openAISchema = {
  type: "object",
  properties: {
    proveedor_nombre: { type: ["string", "null"] },
    numero: { type: ["string", "null"] },
    fecha: { type: ["string", "null"] },
    fecha_vencimiento: { type: ["string", "null"] },
    subtotal_bruto: { type: ["number", "null"] },
    descuento_total: { type: ["number", "null"] },
    subtotal_neto: { type: ["number", "null"] },
    iva_total: { type: ["number", "null"] },
    cargos: {
      type: "array",
      items: {
        type: "object",
        properties: {
          descripcion: { type: "string" },
          importe: { type: "number" },
        },
        required: ["descripcion", "importe"],
        additionalProperties: false,
      },
    },
    total: { type: ["number", "null"] },
    lineas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          descripcion: { type: "string" },
          codigo_proveedor: { type: ["string", "null"] },
          cantidad: { type: "number" },
          cantidad_bonificada: { type: ["number", "null"] },
          cantidad_bonificada_detalle: { type: ["number", "null"] },
          precio_unitario: { type: "number" },
          precio_bruto_unitario: { type: ["number", "null"] },
          precio_neto: { type: ["number", "null"] },
          precio_neto_unitario: { type: ["number", "null"] },
          subtotal_neto: { type: ["number", "null"] },
          precio_final: { type: ["number", "null"] },
          iva: { type: ["number", "null"] },
          iva_importe: { type: ["number", "null"] },
          impuestos_internos: { type: ["number", "null"] },
          descuento: { type: ["number", "null"] },
          porcentaje_descuento: { type: ["number", "null"] },
          tipo_descuento: { type: ["string", "null"] },
          descuentos: {
            type: "array",
            items: {
              type: "object",
              properties: {
                porcentaje: { type: ["number", "null"] },
                importe: { type: ["number", "null"] },
                descripcion: { type: ["string", "null"] },
              },
              required: ["porcentaje", "importe", "descripcion"],
              additionalProperties: false,
            },
          },
          grupo_descuento: { type: ["string", "null"] },
          bonificacion: { type: ["number", "null"] },
          bonificacion_importe: { type: ["number", "null"] },
          bonificacion_tipo: { type: ["string", "null"] },
          tipo_bonificacion: { type: ["string", "null"] },
        },
        required: [
          "descripcion",
          "codigo_proveedor",
          "cantidad",
          "cantidad_bonificada",
          "cantidad_bonificada_detalle",
          "precio_unitario",
          "precio_bruto_unitario",
          "precio_neto",
          "precio_neto_unitario",
          "subtotal_neto",
          "precio_final",
          "iva",
          "iva_importe",
          "impuestos_internos",
          "descuento",
          "porcentaje_descuento",
          "tipo_descuento",
          "descuentos",
          "grupo_descuento",
          "bonificacion",
          "bonificacion_importe",
          "bonificacion_tipo",
          "tipo_bonificacion",
        ],
        additionalProperties: false,
      },
    },
  },
  required: [
    "proveedor_nombre",
    "numero",
    "fecha",
    "fecha_vencimiento",
    "subtotal_bruto",
    "descuento_total",
    "subtotal_neto",
    "iva_total",
    "cargos",
    "total",
    "lineas",
  ],
  additionalProperties: false,
};

function crearPrompt(tipo: TipoComprobanteIA) {
  const contexto =
    tipo === "factura"
      ? "Es una FACTURA de compra argentina."
      : "Es un REMITO de compra argentino. No tiene IVA ni impuestos, pero puede tener descuentos y bonificaciones.";

  return `
Sos un analista experto en comprobantes de compra de Argentina.

${contexto}

Analizá TODO el documento antes de responder.

Es MUY IMPORTANTE conservar la estructura visual y las relaciones entre columnas de la factura.

No leas simplemente el documento como texto lineal.

Identificá correctamente:

- descripción
- código del proveedor
- cantidad
- cantidad bonificada
- precio unitario
- precio bruto
- descuentos
- bonificaciones
- precio neto
- IVA
- importe de IVA
- impuestos internos
- subtotal
- total

REGLAS DE DESCUENTOS:

1. Descuento porcentual por línea.
2. Descuento porcentual aplicado a un grupo de productos.
3. Bonificación por cantidad, por ejemplo:
   - 3 unidades y se bonifica 1
   - 5 unidades y se bonifica 1
   - 5 unidades y se bonifican 2

El IVA normalmente se calcula DESPUÉS de aplicar descuentos.

No inventes valores.

Si un dato no aparece, devolvé null.

En una bonificación gratuita, no confundas la cantidad bonificada con un descuento monetario.

Devolvé únicamente el JSON solicitado.
`;
}

export async function extraerConOpenAI(
  base64: string,
  mimeType: string,
  tipo: TipoComprobanteIA
): Promise<ComprobanteExtraido> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Falta la variable de entorno OPENAI_API_KEY");
  }

  const openai = new OpenAI({ apiKey });
  const prompt = crearPrompt(tipo);

  const contenido =
    mimeType === "application/pdf"
      ? [
          {
            type: "input_file" as const,
            filename: "comprobante.pdf",
            file_data: `data:application/pdf;base64,${base64}`,
          },
          {
            type: "input_text" as const,
            text: prompt,
          },
        ]
      : [
          {
            type: "input_image" as const,
            image_url: `data:${mimeType};base64,${base64}`,
            detail: "high" as const,
          },
          {
            type: "input_text" as const,
            text: prompt,
          },
        ];

  const response = await openai.responses.create({
    model: "gpt-4o-mini",
    input: [
      {
        role: "user",
        content: contenido,
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "comprobante_extraido",
        strict: true,
        schema: openAISchema,
      },
    },
  });

  if (!response.output_text) {
    throw new Error("GPT no devolvió información");
  }

  try {
    return JSON.parse(response.output_text) as ComprobanteExtraido;
  } catch {
    throw new Error("GPT devolvió un JSON inválido");
  }
}
