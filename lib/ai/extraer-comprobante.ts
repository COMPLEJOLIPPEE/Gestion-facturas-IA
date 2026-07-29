import { extraerConGemini } from "./providers/gemini"
import { extraerConOCRSpace } from "./providers/ocrspace"
import type { ComprobanteExtraido, TipoComprobanteIA } from "./tipos"

export type { ComprobanteExtraido, TipoComprobanteIA, LineaExtraida } from "./tipos"

/**
 * Punto único de entrada para leer un comprobante (factura/remito) con IA.
 * Hoy usa Gemini, pero si falla se usa OCR.space como fallback.
 */
export async function extraerComprobante(
  base64: string,
  mimeType: string,
  tipo: TipoComprobanteIA
): Promise<ComprobanteExtraido> {
  try {
    return await extraerConGemini(base64, mimeType, tipo)
  } catch (err) {
    console.warn("Gemini falló, usando OCR.space:", err)
    return await extraerConOCRSpace(base64, mimeType, tipo)
  }
}
