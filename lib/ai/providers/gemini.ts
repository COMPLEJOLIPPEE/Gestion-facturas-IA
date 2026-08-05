import { GoogleGenAI } from "@google/genai"
import type { ComprobanteExtraido, TipoComprobanteIA } from "../tipos"

const schema = { /* igual que antes */ }

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
      ? "Es una FACTURA de compra argentina, que puede incluir IVA discriminado por línea o global."
      : "Es un REMITO de compra argentino, normalmente sin IVA discriminado."

  const prompt = `Analizá este comprobante de compra y extraé los datos en el formato solicitado. ${contexto}
Si un dato no está visible o no aplica, devolvé null en ese campo.
Las fechas van en formato YYYY-MM-DD. Los montos son números, sin símbolo de moneda ni separadores de miles.`

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
    })),
  }
}
