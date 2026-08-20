import { extraerConGemini } from "./providers/gemini"
import { extraerConOpenAI } from "./providers/openai"
import type {
  ComprobanteExtraido,
  TipoComprobanteIA,
} from "./tipos"

import {
  crearLogIA,
  actualizarLogIA,
} from "./logs"

export type {
  ComprobanteExtraido,
  TipoComprobanteIA,
  LineaExtraida,
} from "./tipos"

export class GeminiFallbackRequiredError extends Error {
  logId: string | null

  constructor(message: string, logId: string | null) {
    super(message)
    this.name = "GeminiFallbackRequiredError"
    this.logId = logId
  }
}

/**
 * Gemini es siempre la IA principal.
 * Si falla, no se ejecuta GPT automáticamente:
 * se solicita autorización al usuario.
 */
export async function extraerComprobante(
  base64: string,
  mimeType: string,
  tipo: TipoComprobanteIA
): Promise<ComprobanteExtraido> {
  const logId = await crearLogIA({
    proveedorIA: "Gemini",
    iaSecundaria: "GPT-4o-mini",
  })

  try {
    const resultado = await extraerConGemini(
      base64,
      mimeType,
      tipo
    )

    await actualizarLogIA({
      logId: logId ?? "",
      estado: "exitoso",
      lineasDetectadas: resultado.lineas?.length ?? 0,
    })

    return resultado
  } catch (err) {
    const mensaje =
      err instanceof Error
        ? err.message
        : "Error desconocido al procesar con Gemini"

    await actualizarLogIA({
      logId: logId ?? "",
      estado: "error",
      motivoError: mensaje,
    })

    throw new GeminiFallbackRequiredError(mensaje, logId)
  }
}

/**
 * GPT-4o-mini se ejecuta solamente después
 * de la autorización del usuario.
 */
export async function procesarConOpenAIAutorizado(
  base64: string,
  mimeType: string,
  tipo: TipoComprobanteIA,
  logGeminiId: string | null
): Promise<ComprobanteExtraido> {
  if (logGeminiId) {
    await actualizarLogIA({
      logId: logGeminiId,
      estado: "autorizado",
      accionUsuario:
        "Autorizó uso de GPT-4o-mini como alternativa",
    })
  }

  const logOpenAIId = await crearLogIA({
    proveedorIA: "GPT-4o-mini",
  })

  try {
    const resultado = await extraerConOpenAI(
      base64,
      mimeType,
      tipo
    )

    await actualizarLogIA({
      logId: logOpenAIId ?? "",
      estado: "exitoso",
      lineasDetectadas: resultado.lineas?.length ?? 0,
    })

    return resultado
  } catch (err) {
    const mensaje =
      err instanceof Error
        ? err.message
        : "Error desconocido al procesar con GPT-4o-mini"

    await actualizarLogIA({
      logId: logOpenAIId ?? "",
      estado: "error",
      motivoError: mensaje,
    })

    throw err
  }
}
