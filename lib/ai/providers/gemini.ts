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
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (isServiceUnavailable(error)) {
        await new Promise((res) => setTimeout(res, delayMs))
      } else {
        throw error
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Gemini no respondió tras varios intentos")
}

export async function extraerConGemini(
  base64: string,
  mimeType: string,
  tipo: TipoComprobanteIA
): Promise<ComprobanteExtraido> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("Falta la variable de entorno GEMINI_API_KEY")

  const ai = new GoogleGenAI({ apiKey })
  const modelo = process.env.GEMINI_MODEL || "gemini-3.5-flash"

 const contexto =
  tipo === "factura"
    ? "Es una FACTURA de compra argentina."
    : "Es un REMITO de compra argentino."

const prompt = `
Sos un analista experto en comprobantes de compra de Argentina.

${contexto}

Tu tarea es leer el documento completo y devolver únicamente un JSON válido siguiendo exactamente el schema recibido.

Reglas importantes:

- Identificá correctamente el proveedor.
- Identificá el número del comprobante.
- Identificá la fecha.
- Identificá el vencimiento si existe.
- Identificá el total del comprobante.

Para cada producto:

- descripcion
- codigo_proveedor (si aparece)
- cantidad
- precio_unitario
- iva
- descuento
- precio_final

IMPORTANTE:

El descuento puede aparecer:

- como porcentaje
- como importe
- por línea
- o puede no existir.

Si existe un descuento por línea devolvelo en "descuento".

Si existe un precio final luego del descuento devolvelo en "precio_final".

Si no existe descuento devolver 0.

Si no es posible calcular el precio final devolver null.

No inventes productos.

No inventes cantidades.

No inventes descuentos.

Las fechas deben estar en formato YYYY-MM-DD.

Todos los importes deben ser números.

No agregues texto.

Respondé únicamente el JSON.
`
  const response = await withRetry(() =>
    ai.models.generateContent({
      model: modelo,
      contents: [
        { role: "user", parts: [{ text: prompt }, { inlineData: { mimeType, data: base64 } }] },
      ],
      config: { responseMimeType: "application/json", responseSchema: schema },
    })
  )

  const texto = response.text
  if (!texto) throw new Error("Gemini no devolvió contenido")

  const data = JSON.parse(texto) as ComprobanteExtraido
  return {
    proveedor_nombre: data.proveedor_nombre ?? null,
    numero: data.numero ?? null,
    fecha: data.fecha ?? null,
    fecha_vencimiento: data.fecha_vencimiento ?? null,
    total: data.total ?? null,
lineas: (data.lineas ?? []).map((l) => ({

  descripcion: l.descripcion,

  cantidad: Number(l.cantidad ?? 0),

  precio_unitario: Number(l.precio_unitario ?? 0),

  iva: l.iva ?? null,

  codigo_proveedor: null,

  producto_id: undefined,

  score: undefined,

  confianza: undefined,

  motivo: undefined,

  fuente: undefined,

})),
  }
}
