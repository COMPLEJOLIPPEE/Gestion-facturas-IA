import OpenAI from "openai";
import type { ComprobanteExtraido, TipoComprobanteIA } from "../tipos";

const cargoSchema = {
  type: "array",
  items: {
    type: "object",
    properties: { descripcion: { type: "string" }, importe: { type: "number" } },
    required: ["descripcion", "importe"],
    additionalProperties: false,
  },
};

const openAISchema = {
  type: "object",
  properties: {
    proveedor_nombre: { type: ["string", "null"] }, numero: { type: ["string", "null"] }, fecha: { type: ["string", "null"] }, fecha_vencimiento: { type: ["string", "null"] },
    subtotal_bruto: { type: ["number", "null"] }, descuento_total: { type: ["number", "null"] }, subtotal_neto: { type: ["number", "null"] }, iva_total: { type: ["number", "null"] }, impuestos_internos_total: { type: ["number", "null"] },
    percepciones: cargoSchema, otros_cargos: cargoSchema, cargos: cargoSchema, total: { type: ["number", "null"] },
    lineas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          descripcion: { type: "string" }, codigo_proveedor: { type: ["string", "null"] }, cantidad: { type: "number" }, cantidad_bonificada: { type: ["number", "null"] }, cantidad_bonificada_detalle: { type: ["number", "null"] },
          precio_unitario: { type: "number" }, precio_bruto_unitario: { type: ["number", "null"] }, precio_neto: { type: ["number", "null"] }, precio_neto_unitario: { type: ["number", "null"] }, subtotal_neto: { type: ["number", "null"] }, precio_final: { type: ["number", "null"] },
          iva: { type: ["number", "null"] }, iva_importe: { type: ["number", "null"] }, impuestos_internos: { type: "number" }, descuento: { type: ["number", "null"] }, porcentaje_descuento: { type: ["number", "null"] }, tipo_descuento: { type: ["string", "null"] },
          tipo_linea: { type: "string" }, es_ajuste_negativo: { type: "boolean" },
          descuentos: { type: "array", items: { type: "object", properties: { porcentaje: { type: ["number", "null"] }, importe: { type: ["number", "null"] }, descripcion: { type: ["string", "null"] } }, required: ["porcentaje", "importe", "descripcion"], additionalProperties: false } },
          grupo_descuento: { type: ["string", "null"] }, aplica_a_descripciones: { type: "array", items: { type: "string" } },
          bonificacion: { type: ["number", "null"] }, bonificacion_importe: { type: ["number", "null"] }, bonificacion_tipo: { type: ["string", "null"] }, tipo_bonificacion: { type: ["string", "null"] },
          cargos: cargoSchema, columnas_presentes: { type: "array", items: { type: "string" } },
        },
        required: ["descripcion", "codigo_proveedor", "cantidad", "cantidad_bonificada", "cantidad_bonificada_detalle", "precio_unitario", "precio_bruto_unitario", "precio_neto", "precio_neto_unitario", "subtotal_neto", "precio_final", "iva", "iva_importe", "impuestos_internos", "descuento", "porcentaje_descuento", "tipo_descuento", "descuentos", "grupo_descuento", "aplica_a_descripciones", "bonificacion", "bonificacion_importe", "bonificacion_tipo", "tipo_bonificacion", "cargos", "columnas_presentes"],
        additionalProperties: false,
      },
    },
  },
  required: ["proveedor_nombre", "numero", "fecha", "fecha_vencimiento", "subtotal_bruto", "descuento_total", "subtotal_neto", "iva_total", "impuestos_internos_total", "percepciones", "otros_cargos", "cargos", "total", "lineas"],
  additionalProperties: false,
};

function crearPrompt(tipo: TipoComprobanteIA) {
  const contexto = tipo === "factura" ? "Es una FACTURA de compra argentina." : "Es un REMITO de compra argentino.";
  return `
Sos un analista experto en comprobantes de compra de Argentina.
${contexto}
Analizá TODO el documento antes de responder y devolvé únicamente el JSON solicitado.

La factura es una TABLA VISUAL. Reconstruí la relación entre encabezado, columna y fila; no leas solamente texto lineal.

REGLAS GENERALES:
- No omitas ninguna fila comercial visible que tenga descripción e importe.
- Clasificá cada fila como producto, descuento_linea, descuento_agrupado o ajuste.
- Un descuento/bonificación general que afecta a varios productos debe quedar como línea independiente y NO asociarse a ningún producto.
- No repartas descuentos agrupados entre productos salvo indicación explícita.
- Cargos de logística, administración u otros pueden aparecer dentro de una línea: guardalos en cargos de esa línea. Si aparecen aparte, guardalos en cargos generales.
- Una bonificación por cantidad (ej. 3+1) conserva cantidad_bonificada.

IVA - REGLA CRÍTICA:
- Buscá primero el cuadro/resumen fiscal donde aparecen "IVA 21%", "IVA 10,5%", "IVA 27%", "IVA 5%", "IVA 2,5%" o "IVA 0%".
- Si allí aparece un importe distinto de 0 para una alícuota, esa alícuota es la fuente de verdad. NO asumas 21% por defecto.
- Si la tabla no tiene columna IVA pero el pie fiscal informa una sola alícuota no nula para las líneas gravadas, asignala a las líneas aunque no esté en columnas_presentes.
- iva_importe es solamente el IVA de la línea. No confundas IVA con percepción de IVA.

DESCUENTOS Y BONIFICACIONES - UNIDAD OBLIGATORIA:
- Leé literalmente DTO., Dto., Descuento, Bonif. y equivalentes.
- Cada valor debe clasificarse como porcentaje, importe monetario o cantidad bonificada.
- Si aparece %, guardalo en porcentaje_descuento o bonificacion_tipo=porcentaje y no lo conviertas en pesos.
- Si el símbolo % NO aparece pero la columna representa porcentajes (por ejemplo BONIF. con valores 50, 25 o 20) y el cálculo porcentual explica el precio neto o el importe de la fila, tratá el valor como porcentaje.
- Para decidir, priorizá el encabezado de la columna y la consistencia matemática entre cantidad, precio unitario, precio neto e importe final.
- Ejemplo: precio 146280,99, cantidad 2, BONIF 50 y total 177000 con IVA 21% implica BONIF 50%, no $50.
- Si DTO=20 es un porcentaje, devolvé porcentaje_descuento=20 y tipo_descuento=porcentaje.
- Si es monetario, devolvelo en descuento/bonificacion_importe y tipo=importe.
- Descuentos sucesivos van en descuentos[] y se aplican en secuencia, no se suman como porcentajes simples.
- Si existe precio neto unitario o subtotal neto impreso, tiene prioridad y no debe volver a descontarse.

IMPORTES:
- Si la factura imprime subtotal neto de línea, usalo como subtotal_neto.
- Si imprime precio neto unitario pero no subtotal neto, calculá subtotal_neto = precio_neto_unitario × cantidad.
- Si imprime IMPORTE/TOTAL de línea incluyendo IVA, NO lo guardes como subtotal_neto; usalo para validar.
- No fuerces las líneas para hacer coincidir el total.

IMPUESTOS INTERNOS:
Si existe I.I., I. INTERNOS, IMP INT, IMP. INT, IMP INTERNO o equivalente, leer el importe alineado para cada fila. Si existe pero vale 0, conservar 0.

COLUMNAS VISIBLES:
En columnas_presentes devolvé SOLO las columnas que realmente aparecen en la tabla, en el mismo orden visual. Claves permitidas: cantidad, descripcion, codigo, precio_unitario, descuento, bonificacion, precio_neto_unitario, iva, iva_importe, impuestos_internos, cargo, subtotal_neto, importe.
Si una columna existe aunque todos sus valores sean 0, incluila. Si no existe, no la inventes.

DATOS GENERALES:
Identificá proveedor, número, fechas, subtotal bruto, descuento total, subtotal neto, IVA total, impuestos internos total, percepciones, otros cargos y total final.
Si un dato no aparece, devolvé null.
`;
}

export async function extraerConOpenAI(base64: string, mimeType: string, tipo: TipoComprobanteIA): Promise<ComprobanteExtraido> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Falta la variable de entorno OPENAI_API_KEY");
  const openai = new OpenAI({ apiKey });
  const prompt = crearPrompt(tipo);
  const contenido = mimeType === "application/pdf"
    ? [{ type: "input_file" as const, filename: "comprobante.pdf", file_data: `data:application/pdf;base64,${base64}` }, { type: "input_text" as const, text: prompt }]
    : [{ type: "input_image" as const, image_url: `data:${mimeType};base64,${base64}`, detail: "high" as const }, { type: "input_text" as const, text: prompt }];
  const response = await openai.responses.create({ model: "gpt-4o-mini", input: [{ role: "user", content: contenido }], text: { format: { type: "json_schema", name: "comprobante_extraido", strict: true, schema: openAISchema } } });
  if (!response.output_text) throw new Error("GPT no devolvió información");
  try { return JSON.parse(response.output_text) as ComprobanteExtraido; } catch { throw new Error("GPT devolvió un JSON inválido"); }
}
