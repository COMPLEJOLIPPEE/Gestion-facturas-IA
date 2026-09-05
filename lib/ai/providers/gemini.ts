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
Si existe una de estas columnas, leé literalmente el importe alineado de CADA FILA.
No calcules impuestos internos. Si la columna existe pero la fila está vacía o en 0, devolvé 0.
`

const REGLAS_LINEAS = `
REGLAS OBLIGATORIAS PARA LAS FILAS:
- No omitas ninguna fila comercial visible que tenga descripción y/o importe.
- Cada fila debe clasificarse como producto, descuento_linea, descuento_agrupado o ajuste.
- Una línea de descuento o bonificación que afecta a varios productos NO se debe asociar a ningún producto del catálogo.
- Conservá las líneas independientes y su importe/signo tal como aparecen.
- No repartas descuentos agrupados entre productos.
- Si una fila tiene un cargo propio, leé y guardá el cargo tal como aparece.
- Una bonificación por cantidad (por ejemplo 3+1) debe conservar la cantidad bonificada si está impresa.
`

const COLUMNAS = `
ESTRUCTURA VISUAL DE LA TABLA:
- Detectá las columnas que REALMENTE aparecen en la tabla de productos.
- Devolvé en columnas_presentes las claves canónicas, en el mismo orden visual.
- Claves permitidas: cantidad, descripcion, codigo, precio_unitario, descuento, bonificacion, precio_neto_unitario, iva, iva_importe, impuestos_internos, cargo, subtotal_neto, importe.
- Si una columna existe aunque sus valores sean 0, IGUAL debe aparecer.
- Si una columna no existe, NO la inventes.
`

const REGLAS_IVA = `
IVA: SOLO LECTURA
- Buscá el cuadro/resumen fiscal del comprobante donde aparecen "IVA 21%", "IVA 10,5%", "IVA 27%", "IVA 5%", "IVA 2,5%" o "IVA 0%".
- Leé y guardá exactamente los importes impresos para cada alícuota.
- Si la tabla tiene una columna IVA, leé literalmente el valor de cada fila.
- Si la tabla NO tiene columna IVA, NO inventes un IVA por defecto para las líneas. Guardá la alícuota del pie en iva_total solo si está impresa.
- No calcules IVA a partir de subtotal, precio unitario o total.
- No confundas "Percepción IVA" con "IVA".
`

const REGLAS_DESCUENTOS = `
DESCUENTOS Y BONIFICACIONES: LEER, NO CALCULAR
- Leé literalmente las columnas DTO., Dto., Descuento, Bonif. y equivalentes.
- Si el comprobante imprime %, guardá el porcentaje sin el símbolo.
- Si no imprime %, NO conviertas el valor a pesos ni a porcentaje por inferencia matemática. Conservá el valor y el tipo solo si el encabezado permite determinarlo.
- Si el comprobante imprime un importe monetario, guardalo como importe.
- Si imprime una cantidad bonificada, guardá esa cantidad.
- Si hay varios descuentos sucesivos, guardalos individualmente en descuentos[] tal como aparecen. NO los sumes ni los apliques.
- Si existe precio neto unitario, subtotal neto o importe de línea impreso, LEÉ ese valor directamente. NO lo recalcules.
- Nunca inventes un descuento para hacer coincidir el total.
`

const REGLAS_EXTRACCION_LITERAL = `
REGLA CENTRAL: LA IA ES UN LECTOR, NO UNA CALCULADORA.
- No sumes, restes, multipliques ni dividas importes de la factura para completar campos.
- No derives subtotal_neto desde precio_neto_unitario × cantidad.
- No derives precio_neto_unitario desde subtotal_neto ÷ cantidad.
- No derives IVA desde una alícuota aplicada a un subtotal.
- No derives descuentos/bonificaciones desde diferencias entre precios.
- No derives importe_linea desde subtotal + IVA.
- Cada campo debe contener el valor que esté IMPRESO en el documento.
- Si un campo no está impreso o no puede leerse con seguridad, devolvé null cuando el schema lo permita.
- La única interpretación permitida es identificar qué columna/concepto representa cada dato visible.
- Los cálculos de control y el costo unitario se realizan FUERA de la IA, en la aplicación.
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
Reconstruí la relación entre encabezado, columna y fila, pero NO hagas cálculos para completar datos.

==================================================
${REGLAS_EXTRACCION_LITERAL}
==================================================
${DICCIONARIO_IMPUESTOS_INTERNOS}
==================================================
${REGLAS_LINEAS}
==================================================
${COLUMNAS}
==================================================
${REGLAS_IVA}
==================================================
${REGLAS_DESCUENTOS}
==================================================
DATOS GENERALES Y TOTALES OFICIALES
==================================================
Identificá y LEÉ literalmente los importes impresos del pie/resumen:
- subtotal bruto
- descuento total
- subtotal neto
- IVA total
- impuestos internos total
- percepciones
- otros cargos
- total final

No calcules ningún total faltante a partir de otros valores.
Si un dato no aparece, devolvé null.

==================================================
IMPORTES DE CADA LÍNEA
==================================================
Para cada línea identificá, SOLO SI ESTÁ IMPRESO:
descripción, código del proveedor, cantidad, precio unitario, precio bruto unitario,
descuentos, bonificaciones, precio neto, precio neto unitario, IVA, importe de IVA,
impuestos internos, cargos propios de la línea, subtotal neto e importe/total de línea.

Si la factura imprime un subtotal neto de línea, guardalo en subtotal_neto.
Si NO lo imprime, NO lo calcules.
Si imprime precio neto unitario, guardalo en precio_neto_unitario.
Si NO lo imprime, NO lo calcules.
Si imprime "IMPORTE" o "TOTAL" de línea, guardalo en importe_linea exactamente como aparece.
No transformes importe_linea en subtotal_neto.

Para una línea de descuento agrupado:
- tipo_linea = descuento_agrupado
- no requiere producto
- es_ajuste_negativo = true si la factura la presenta como reducción
- conservá el importe y signo impresos
- NO la asocies a un producto

Para una línea de descuento individual:
- tipo_linea = descuento_linea
- conservá el valor impreso
- no requiere producto cuando es una línea independiente

Para una línea normal:
- tipo_linea = producto
- es_ajuste_negativo = false

Para cargos:
- guardalos tal como aparecen, sin sumarlos ni distribuirlos.

==================================================
SIGNOS
==================================================
Usá el signo que visualmente tenga el importe en la factura.
No agregues signo negativo por deducción matemática.
No conviertas descuentos/bonificaciones en importes monetarios si la factura no los presenta así.

==================================================
VALIDACIÓN VISUAL
==================================================
Podés revisar visualmente que las columnas estén correctamente alineadas, pero NO modifiques valores para que coincidan entre sí.
Si subtotal, IVA o total no coinciden con la suma de líneas, conservá TODOS los valores impresos y no intentes corregirlos.
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
