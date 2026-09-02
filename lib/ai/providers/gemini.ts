import { GoogleGenAI } from "@google/genai"
import type { ComprobanteExtraido, TipoComprobanteIA } from "../tipos"
import { schema } from "./schema"

function isServiceUnavailable(error: unknown) {
  if (!error || typeof error !== "object") return false
  const { code, message } = error as { code?: unknown; message?: unknown }
  return code === 503 || (typeof message === "string" && message.includes("UNAVAILABLE"))
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 2000): Promise<T> {
  let lastError: unknown
  for (let i = 0; i < retries; i++) {
    try { return await fn() } catch (error) {
      lastError = error
      if (isServiceUnavailable(error)) await new Promise((res) => setTimeout(res, delayMs))
      else throw error
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Gemini no respondió tras varios intentos")
}

const DICCIONARIO_IMPUESTOS_INTERNOS = `
ENCABEZADOS EQUIVALENTES A IMPUESTOS INTERNOS:
I.I | I.I. | I INTERNOS | I. INTERNOS | I INTERNO | I. INTERNO |
IMP I | IMP.I | IMP INT | IMP. INT | IMP INTERNO | IMP. INTERNO |
IMP INTERNOS | IMP. INTERNOS | CARGOS INT | CARGOS INTERNOS.

Todos estos encabezados significan exactamente la columna impuestos_internos.
Si existe una columna con cualquiera de estas variantes, hay que leer el importe alineado en esa columna para CADA FILA.
No confundirla con IVA, IVA $, descuento, precio neto ni total.
La posición visual de la columna debe conservarse aunque el OCR haya separado o abreviado el encabezado.
Si la columna existe pero una fila está vacía, devolver 0 para esa fila.
`

const DICCIONARIO_DESCUENTOS = `
REGLAS PARA DESCUENTOS Y BONIFICACIONES:
- Nunca omitas una fila de la tabla que tenga descripción y un importe, aunque no sea un producto.
- Una fila que represente una reducción del importe debe conservarse como línea y marcarse como descuento_linea, descuento_agrupado o ajuste.
- Si la descripción combina un porcentaje con una marca/producto/presentación, es un descuento agrupado aunque no diga literalmente "descuento".
- Ejemplos: "30 Power 500" significa 30% de descuento sobre los productos Powerade de 500 ml; "PWD 1.500-25%-PDV" significa 25% de descuento sobre los productos Powerade de 1,5 litros.
- PWD, POW, POWER y POWERADE pueden referirse a la misma marca/producto según el comprobante.
- 500, 500ML, 500X6 representan una presentación de 500 ml; 1.5L, 1.500, 1500ML representan una presentación de 1,5 litros.
- Para un descuento agrupado, completá porcentaje_descuento y aplica_a_descripciones con una descripción suficientemente amplia para encontrar TODAS las líneas afectadas.
- Si el comprobante muestra el importe total del descuento en el pie, también informalo en descuento_total.
- No conviertas una línea de descuento agrupado en producto y no la asocies a un producto del catálogo.
`

export async function extraerConGemini(base64: string, mimeType: string, tipo: TipoComprobanteIA): Promise<ComprobanteExtraido> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("Falta la variable de entorno GEMINI_API_KEY")

  const ai = new GoogleGenAI({ apiKey })
  const modelo = process.env.GEMINI_MODEL || "gemini-3.5-flash"
  const contexto = tipo === "factura" ? "Es una FACTURA de compra argentina." : "Es un REMITO de compra argentino."

  const prompt = `
Sos un analista experto en comprobantes de compra de Argentina.

${contexto}

Analizá TODO el documento antes de responder.
Devolvé únicamente un JSON válido siguiendo exactamente el schema recibido.

==================================================
DICCIONARIO DE COLUMNAS — OBLIGATORIO
==================================================
${DICCIONARIO_IMPUESTOS_INTERNOS}

==================================================
DESCUENTOS AGRUPADOS — OBLIGATORIO
==================================================
${DICCIONARIO_DESCUENTOS}

IMPORTANTE: no leas la factura solamente como texto lineal. Es una tabla.
Reconstruí la relación visual entre encabezado, columna y fila.
Si el encabezado dice "I. INTERNOS", el número alineado debajo de ese encabezado pertenece al campo impuestos_internos.
Esto debe hacerse aunque el OCR escriba el encabezado como I.I, IMP INT, IMP. INTERNOS, etc.

==================================================
DATOS GENERALES Y TOTALES OFICIALES
==================================================

Identificá proveedor, número, fechas y los importes del PIE/RESUMEN:
- subtotal bruto
- descuento total
- subtotal neto
- IVA total
- impuestos internos total
- percepciones
- otros cargos
- total final

Los importes del PIE/RESUMEN son la fuente de verdad.
Si el pie muestra impuestos internos, cargalos en el campo impuestos_internos_total.
Si muestra percepciones u otros cargos que forman parte del total, cargalos en cargos.

Si existe una columna de impuestos internos, extraé TAMBIÉN el importe de cada fila en el campo impuestos_internos.
El total de impuestos internos debe ser consistente con la suma de esas líneas, salvo redondeos.

No inventes información. Si una columna de impuestos internos no existe en el documento, usá 0 en las líneas y null para el total si tampoco aparece en el pie.
Todos los importes deben ser números.

==================================================
INTERPRETACIÓN DE SIGNOS
==================================================

NO interpretes un guion "-" como signo negativo solamente porque aparece cerca de un número.
Un importe es negativo solamente cuando el documento muestra evidencia clara de que representa una reducción/ajuste.
Nunca conviertas un importe negativo en positivo por tu cuenta.

Para CADA fila comercial visible indicá tipo_linea: producto, descuento_linea, descuento_agrupado o ajuste.
NO OMITAS filas de descuento, bonificación o ajuste aunque no tengan código de producto.
es_ajuste_negativo es true solamente cuando el documento confirme que la línea es un ajuste negativo.

==================================================
PRODUCTOS, DESCUENTOS, IVA E IMPUESTOS
==================================================

Para cada línea identificá:
descripcion, codigo_proveedor, cantidad, precio_unitario, precio_bruto_unitario,
descuento, porcentaje_descuento, descuentos, grupo_descuento, bonificacion,
tipo_bonificacion, cantidad_bonificada_detalle, precio_neto, precio_neto_unitario,
precio_final, subtotal_neto, iva, iva_importe, impuestos_internos.

Para una línea de descuento agrupado:
- tipo_linea debe ser descuento_agrupado;
- es_ajuste_negativo debe ser false;
- no requiere producto_id;
- porcentaje_descuento debe contener el porcentaje si aparece en la línea;
- aplica_a_descripciones debe contener los productos/presentaciones afectados;
- conservá la descripción original completa.

iva es la alícuota en porcentaje.
iva_importe es el importe de IVA de la línea.
impuestos_internos es EXCLUSIVAMENTE el importe de la columna de impuestos internos.

Para una línea negativa confirmada, conservá los signos negativos de precio/subtotal/IVA cuando correspondan.
Para una línea normal, precio_unitario debe ser positivo salvo indicación expresa del documento.

==================================================
VALIDACIÓN
==================================================

Comprobá cuando sea posible:
subtotal neto + IVA + impuestos internos + cargos = total final

Comprobá también que el descuento_total del pie sea compatible con la suma de descuentos/bonificaciones identificados.

No fuerces las líneas para hacer coincidir el total. Conservá los importes oficiales del pie.
`

  const contenido = mimeType === "application/pdf"
    ? [{ inlineData: { mimeType: "application/pdf", data: base64 } }, { text: prompt }]
    : [{ inlineData: { mimeType, data: base64 } }, { text: prompt }]

  const response = await withRetry(() => ai.models.generateContent({
    model: modelo,
    contents: [{ role: "user", parts: contenido }],
    config: { responseMimeType: "application/json", responseSchema: schema },
  }))

  if (!response.text) throw new Error("Gemini no devolvió información")
  try { return JSON.parse(response.text) as ComprobanteExtraido }
  catch { throw new Error("Gemini devolvió un JSON inválido") }
}
