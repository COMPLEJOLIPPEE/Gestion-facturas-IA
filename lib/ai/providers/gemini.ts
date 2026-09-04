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

Todos estos encabezados significan la columna impuestos_internos.
Si existe una columna con cualquiera de estas variantes, leer el importe alineado en esa columna para CADA FILA.
No confundirla con IVA, IVA $, descuento, precio neto ni total.
Si la columna existe pero una fila tiene 0 o está vacía, devolver 0 para esa fila.
`

const REGLAS_LINEAS = `
REGLAS OBLIGATORIAS PARA LAS FILAS:
- No omitas ninguna fila comercial visible que tenga descripción y un importe.
- Cada fila debe clasificarse como producto, descuento_linea, descuento_agrupado o ajuste.
- Una línea de descuento o bonificación que afecta a varios productos NO se debe asociar a ningún producto del catálogo.
- En esos casos conservá la línea independiente y su importe como reducción.
- No intentes repartir un descuento agrupado entre los productos salvo que la factura lo haga explícitamente.
- No conviertas una línea de descuento agrupado en producto.
- Si una fila tiene un cargo propio por logística, administración u otro concepto, conservá ese cargo en cargos de la línea y también el subtotal/importe final de la línea si está impreso.
- Los cargos son positivos; descuentos y bonificaciones son reducciones.
- Una bonificación por cantidad (por ejemplo 3+1) debe conservar la cantidad bonificada y no convertirse automáticamente en descuento monetario.
`

const COLUMNAS = `
ESTRUCTURA VISUAL DE LA TABLA:
- Detectá las columnas que REALMENTE aparecen en la tabla de productos.
- Devolvé en columnas_presentes las claves canónicas, en el mismo orden visual en que aparecen.
- Claves permitidas: cantidad, descripcion, codigo, precio_unitario, descuento, bonificacion, precio_neto_unitario, iva, iva_importe, impuestos_internos, cargo, subtotal_neto, importe.
- Si una columna existe en el documento pero sus valores son 0, IGUAL debe aparecer en columnas_presentes.
- Si una columna no existe, NO la incluyas.
- No agregues columnas solamente porque el modelo conozca ese dato.
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

IMPORTANTE: una factura es una tabla visual. No la leas solamente como texto lineal.
Reconstruí la relación entre encabezado, columna y fila.

==================================================
${DICCIONARIO_IMPUESTOS_INTERNOS}
==================================================
${REGLAS_LINEAS}
==================================================
${COLUMNAS}
==================================================
DATOS GENERALES Y TOTALES OFICIALES
==================================================
Identificá proveedor, número, fechas y los importes del pie/resumen:
- subtotal bruto
- descuento total
- subtotal neto
- IVA total
- impuestos internos total
- percepciones
- otros cargos
- total final

Los importes del pie/resumen son la fuente de verdad para validar el comprobante.
No inventes información. Si un dato no aparece, devolvé null.

==================================================
IMPORTES DE CADA LÍNEA
==================================================
Para cada línea identificá, cuando existan:
descripción, código del proveedor, cantidad, precio unitario, precio bruto unitario,
descuentos, bonificaciones, precio neto, IVA, importe de IVA, impuestos internos,
cargos propios de la línea y subtotal/importe final.

Si la factura imprime un importe/subtotal neto de la línea, ese importe tiene prioridad sobre cualquier cálculo que puedas reconstruir.
Si imprime precio neto unitario, usalo para validar.
No vuelvas a aplicar un descuento que ya esté incorporado en el importe neto impreso.

Para una línea de descuento agrupado:
- tipo_linea = descuento_agrupado
- no requiere producto
- es_ajuste_negativo = true si la línea representa una reducción monetaria
- conservá el importe negativo cuando esté impreso
- NO asocies esa línea a un producto específico
- aplica_a_descripciones puede quedar vacío si la relación no es inequívoca

Para una línea de descuento individual:
- tipo_linea = descuento_linea
- si la línea representa una reducción monetaria, es_ajuste_negativo = true
- no requiere producto cuando es una línea independiente

Para una línea normal de producto:
- tipo_linea = producto
- es_ajuste_negativo = false

Para cargos de una línea:
- guardalos en cargos como conceptos positivos
- no los confundas con impuestos ni descuentos

==================================================
SIGNOS
==================================================
No interpretes un guion aislado como signo negativo.
Usá signo negativo únicamente cuando la factura indique que el importe es una reducción/ajuste.
No conviertas descuentos o bonificaciones en positivos si la factura los muestra como negativos.

==================================================
VALIDACIÓN
==================================================
Comprobá cuando sea posible:
subtotal neto + IVA + impuestos internos + cargos/percepciones = total final.

Comprobá también que el descuento total del pie sea compatible con los descuentos/bonificaciones identificados.

NO fuerces las líneas para hacer coincidir el total. Si existe una diferencia, conservá los importes leídos y dejá que el sistema muestre la advertencia.
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
