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
DATOS GENERALES
==================================================

Identificá:
- proveedor
- número de comprobante
- fecha
- fecha de vencimiento
- subtotal bruto
- descuento total
- subtotal neto
- IVA total
- impuestos internos
- percepciones
- otros cargos
- total final

No inventes información. Si un dato no aparece o no puede determinarse con seguridad, devolvé null.
Las fechas deben estar en formato YYYY-MM-DD. Todos los importes deben ser números.

IMPORTANTE CON LOS TOTALES:
Leé específicamente el pie/resumen de la factura y sus columnas. No confundas P. UNITARIO,
P. NETO, DESCUENTO, SUBTOTAL e IVA. Los totales del pie tienen prioridad para validar la lectura.
El subtotal neto es el importe después de descuentos/ajustes comerciales y antes de IVA,
impuestos y percepciones. El total final debe reconciliar con el pie de la factura.

==================================================
PRODUCTOS Y AJUSTES
==================================================

Para cada línea identificá:
- descripcion
- codigo_proveedor
- cantidad
- cantidad_bonificada
- precio_unitario
- descuento
- porcentaje_descuento
- descuentos
- grupo_descuento
- bonificacion
- tipo_bonificacion
- cantidad_bonificada_detalle
- precio_neto
- precio_final
- subtotal_neto
- iva
- iva_importe
- impuestos_internos

"precio_unitario" representa el precio original de la línea.

ATENCIÓN: algunas facturas argentinas representan descuentos, promociones o ajustes comerciales
como LÍNEAS NEGATIVAS. En esas líneas el precio unitario, subtotal e IVA pueden ser negativos.
NO conviertas esos importes a positivos y NO los elimines. Conservá el signo original para que
los totales puedan reconciliarse.

Si una línea negativa es claramente un ajuste/descuento y no un producto real, igualmente
conservá la línea para poder reconstruir los totales. Podés identificarla con tipo_descuento.

Para una línea negativa:
- conservá precio_unitario negativo;
- conservá subtotal_neto negativo cuando corresponda;
- conservá iva_importe negativo cuando figure así;
- no conviertas el importe a valor absoluto.

Para líneas normales:
- precio_unitario positivo;
- subtotal_neto = cantidad × precio_unitario - descuentos - bonificaciones;
- IVA calculado/aplicado sobre la base neta correspondiente.

==================================================
IVA POR PRODUCTO
==================================================

El campo "iva" representa la ALICUOTA de IVA en porcentaje.
Ejemplos válidos: 21, 10.5, 27, 0.

El campo "iva_importe" representa el IMPORTE de IVA de esa línea y debe conservar su signo.

Si la alícuota no aparece junto a cada producto pero aparece en el pie de la factura, utilizá esa
alícuota para los productos cuando la estructura indique que corresponde a todas las líneas.

==================================================
DESCUENTOS Y BONIFICACIONES
==================================================

Existen descuentos por porcentaje, descuentos de grupo y bonificaciones por cantidad/importe.
No confundas una línea negativa de ajuste con un producto cuyo precio deba convertirse a positivo.

Distribuí descuentos de grupo proporcionalmente según el valor bruto de los productos cuando
el documento permita determinarlo.

==================================================
VALIDACIÓN FINAL
==================================================

Antes de responder, comprobá que:
subtotal neto + IVA + impuestos internos + percepciones + otros cargos = total final
respetando los signos y el redondeo del comprobante.

Si las líneas no permiten reconstruir exactamente el total, conservá los totales del pie de la
factura y no inventes valores de línea.
`

  const contenido = mimeType === "application/pdf"
    ? [
        { inlineData: { mimeType: "application/pdf", data: base64 } },
        { text: prompt },
      ]
    : [
        { inlineData: { mimeType, data: base64 } },
        { text: prompt },
      ]

  const response = await withRetry(() => ai.models.generateContent({
    model: modelo,
    contents: [{ role: "user", parts: contenido }],
    config: { responseMimeType: "application/json", responseSchema: schema },
  }))

  if (!response.text) throw new Error("Gemini no devolvió información")

  try { return JSON.parse(response.text) as ComprobanteExtraido }
  catch { throw new Error("Gemini devolvió un JSON inválido") }
}
