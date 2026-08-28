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
DATOS GENERALES Y TOTALES OFICIALES
==================================================

Identificá proveedor, número, fechas y los importes que figuran en el PIE/RESUMEN del comprobante:
- subtotal bruto
- descuento total
- subtotal neto
- IVA total
- impuestos internos si aparecen
- percepciones
- otros cargos
- total final

Los importes del PIE/RESUMEN son la fuente de verdad para los totales del comprobante.
No los reconstruyas a partir de las líneas si el pie los muestra claramente.

No inventes información. Si un dato no aparece o no puede determinarse con seguridad, devolvé null.
Las fechas deben estar en formato YYYY-MM-DD. Todos los importes deben ser números.

==================================================
INTERPRETACIÓN DE SIGNOS — MUY IMPORTANTE
==================================================

NO interpretes un guion "-" como signo negativo solamente porque aparece cerca de un número.
En documentos argentinos el guion también puede ser un SEPARADOR VISUAL entre columnas, campos o
conceptos. Un importe es negativo solamente cuando el documento muestra evidencia clara de que
ese importe representa una reducción/ajuste:

1. el signo menos está unido al importe o claramente dentro de su columna;
2. el concepto corresponde a descuento, bonificación, devolución, ajuste, crédito u otro concepto
   que contablemente reduce el comprobante;
3. o el signo y el contexto del documento permiten confirmarlo.

Ejemplo: "38.380,17 - 7.000,00" NO significa que 38.380,17 sea negativo.
Ejemplo: una línea de ajuste que muestra "-38.380,17" en la columna de precio/subtotal SÍ es negativa.

Nunca uses Math.abs ni conviertas un importe negativo en positivo por tu cuenta.
Conservá el signo que realmente tenga el comprobante.

Para cada línea indicá también:
- tipo_linea: producto, descuento_linea, descuento_agrupado o ajuste;
- es_ajuste_negativo: true solamente cuando el documento confirme que la línea es un ajuste negativo.

==================================================
PRODUCTOS Y AJUSTES
==================================================

Para cada línea identificá:
- descripcion
- codigo_proveedor
- cantidad
- cantidad_bonificada
- precio_unitario
- precio_bruto_unitario
- descuento
- porcentaje_descuento
- descuentos
- grupo_descuento
- bonificacion
- tipo_bonificacion
- cantidad_bonificada_detalle
- precio_neto
- precio_neto_unitario
- precio_final
- subtotal_neto
- iva
- iva_importe
- impuestos_internos

"precio_unitario" representa el importe unitario que aparece en la columna de precio de esa línea.
No lo transformes a absoluto.

Para una línea negativa confirmada:
- conservá precio_unitario negativo;
- conservá subtotal_neto negativo cuando corresponda;
- conservá iva_importe negativo cuando figure así;
- es_ajuste_negativo = true.

Para una línea normal:
- precio_unitario positivo salvo que el documento indique expresamente lo contrario;
- subtotal_neto = cantidad × precio_unitario menos descuentos/bonificaciones aplicables;
- IVA calculado/aplicado sobre la base neta correspondiente.

==================================================
IVA
==================================================

"iva" es la ALICUOTA en porcentaje: 21, 10.5, 27, 0, etc.
"iva_importe" es el IMPORTE de IVA de la línea y conserva su signo.

No confundas la columna de alícuota con la columna de importe de IVA.

==================================================
DESCUENTOS Y BONIFICACIONES
==================================================

Un descuento o bonificación expresado como concepto puede ser positivo dentro de su propio campo,
porque representa el valor de la reducción. Eso NO significa que el subtotal de la línea deba ser
positivo: el subtotal debe conservar el signo contable que corresponda.

No conviertas una línea negativa de ajuste en producto positivo.
No conviertas un separador "-" en signo negativo sin evidencia documental.

==================================================
VALIDACIÓN ANTES DE RESPONDER
==================================================

Primero identificá los TOTALES DEL PIE.
Después revisá las líneas y sus signos.
Finalmente comprobá, cuando el documento lo permita, que:

subtotal neto + IVA + impuestos internos + percepciones + otros cargos = total final

respetando signos y redondeo.

Si las líneas NO permiten reconstruir exactamente el total del pie, NO fuerces las líneas para que
coincidan. Conservá los importes oficiales del pie y devolvé los valores de línea que realmente se
puedan leer. La aplicación validará la diferencia y pedirá revisión en lugar de guardar un total
incorrecto.
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
