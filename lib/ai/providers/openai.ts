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
          precio_unitario: { type: "number" }, precio_bruto_unitario: { type: ["number", "null"] }, precio_neto: { type: ["number", "null"] }, precio_neto_unitario: { type: ["number", "null"] }, subtotal_neto: { type: ["number", "null"] }, importe_linea: { type: ["number", "null"] }, precio_final: { type: ["number", "null"] },
          iva: { type: ["number", "null"] }, iva_importe: { type: ["number", "null"] }, impuestos_internos: { type: "number" }, descuento: { type: ["number", "null"] }, porcentaje_descuento: { type: ["number", "null"] }, tipo_descuento: { type: ["string", "null"] },
          tipo_linea: { type: "string" }, es_ajuste_negativo: { type: "boolean" },
          descuentos: { type: "array", items: { type: "object", properties: { porcentaje: { type: ["number", "null"] }, importe: { type: ["number", "null"] }, descripcion: { type: ["string", "null"] } }, required: ["porcentaje", "importe", "descripcion"], additionalProperties: false } },
          grupo_descuento: { type: ["string", "null"] }, aplica_a_descripciones: { type: "array", items: { type: "string" } },
          bonificacion: { type: ["number", "null"] }, bonificacion_importe: { type: ["number", "null"] }, bonificacion_tipo: { type: ["string", "null"] }, tipo_bonificacion: { type: ["string", "null"] },
          cargos: cargoSchema, columnas_presentes: { type: "array", items: { type: "string" } },
        },
        required: ["descripcion", "codigo_proveedor", "cantidad", "cantidad_bonificada", "cantidad_bonificada_detalle", "precio_unitario", "precio_bruto_unitario", "precio_neto", "precio_neto_unitario", "subtotal_neto", "importe_linea", "precio_final", "iva", "iva_importe", "impuestos_internos", "descuento", "porcentaje_descuento", "tipo_descuento", "descuentos", "grupo_descuento", "aplica_a_descripciones", "bonificacion", "bonificacion_importe", "bonificacion_tipo", "tipo_bonificacion", "cargos", "columnas_presentes"],
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
Analizá TODO el documento y devolvé únicamente el JSON solicitado.

REGLA CENTRAL: SOS UN LECTOR, NO UNA CALCULADORA.
- Leé literalmente los valores impresos en la factura.
- No sumes, restes, multipliques ni dividas para completar campos.
- No derives subtotal desde precio × cantidad.
- No derives precio neto desde subtotal ÷ cantidad.
- No derives IVA desde una alícuota.
- No derives descuentos/bonificaciones desde diferencias entre precios.
- No derives importe de línea desde subtotal + IVA.
- Si un dato no está impreso o no puede leerse con seguridad, devolvé null cuando corresponda.

TABLA VISUAL:
- La factura es una tabla visual. Reconstruí la relación entre encabezado, columna y fila.
- No omitas ninguna fila comercial visible.
- Clasificá cada fila como producto, descuento_linea, descuento_agrupado o ajuste.
- Un descuento/bonificación general que afecta varios productos debe quedar independiente y NO asociarse a un producto.
- Conservá signos tal como aparecen.

IVA - SOLO LECTURA:
- Buscá el resumen fiscal y LEÉ los importes impresos de IVA 21%, 10,5%, 27%, 5%, 2,5% o 0%.
- Si la tabla tiene columna IVA, leé el valor de cada fila.
- Si no tiene columna IVA, no inventes una alícuota por defecto para las líneas.
- No calcules IVA.
- No confundas IVA con percepción de IVA.

DESCUENTOS Y BONIFICACIONES - SOLO LECTURA:
- Leé literalmente DTO., Dto., Descuento, Bonif. y equivalentes.
- Si aparece %, guardá el porcentaje sin el símbolo.
- Si no aparece %, no conviertas el valor por inferencia matemática. Determiná el tipo solo si el encabezado/contenido visual lo permite.
- Si es importe monetario impreso, guardalo como importe.
- Si es cantidad bonificada impresa, guardala como cantidad.
- Descuentos sucesivos van en descuentos[] tal como aparecen. No los sumes ni los apliques.
- Si existe precio neto, precio neto unitario, subtotal neto o importe de línea impreso, leé ese valor directamente.

IMPORTES DE LÍNEA:
- precio_unitario = valor impreso en la columna correspondiente.
- precio_bruto_unitario = solo si está impreso.
- precio_neto_unitario = solo si está impreso.
- subtotal_neto = solo si está impreso.
- importe_linea = valor impreso en IMPORTE/TOTAL de línea, aunque incluya IVA.
- precio_final = solo si existe un valor explícito equivalente impreso.
- iva_importe = solo si está impreso en la fila.
- impuestos_internos = solo el importe leído de la columna correspondiente; si existe y vale 0, devolver 0.
- cargos = solo cargos explícitos de la línea.

IMPUESTOS INTERNOS:
Si existe una columna I.I., I. INTERNOS, IMP INT, IMP. INT, IMP INTERNO, IMP. INTERNOS, CARGOS INT o equivalente, leer literalmente el importe alineado de CADA FILA. No calcularlo.

COLUMNAS VISIBLES:
En columnas_presentes devolvé SOLO las columnas que realmente aparecen en la tabla, en el mismo orden visual. Claves: cantidad, descripcion, codigo, precio_unitario, descuento, bonificacion, precio_neto_unitario, iva, iva_importe, impuestos_internos, cargo, subtotal_neto, importe.
Si una columna existe aunque sus valores sean 0, incluila. Si no existe, no la inventes.

DATOS GENERALES:
Leé literalmente proveedor, número, fechas, subtotal bruto, descuento total, subtotal neto, IVA total, impuestos internos total, percepciones, otros cargos y total final.
No calcules ningún dato faltante a partir de otros.

DESCUENTOS AGRUPADOS:
- tipo_linea = descuento_agrupado
- es_ajuste_negativo = true cuando representa una reducción
- conservá el importe y signo impresos
- no requiere producto

VALIDACIÓN:
Podés verificar visualmente la alineación de columnas, pero NO modifiques ningún dato para hacer coincidir subtotales o totales.
La aplicación realizará las validaciones y cálculos derivados fuera de la IA.
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
