import { extraerConGemini } from "./providers/gemini"
import { extraerConOCRSpace } from "./providers/ocrspace"
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

/**
 * Error especial:
 * Gemini falló y el sistema debe consultar al usuario
 * antes de utilizar OCR.space.
 */
export class GeminiFallbackRequiredError extends Error {
  logId: string | null

  constructor(
    message: string,
    logId: string | null
  ) {
    super(message)

    this.name =
      "GeminiFallbackRequiredError"

    this.logId = logId
  }
}

/**
 * Punto único de entrada para leer un comprobante.
 *
 * Flujo:
 *
 * Gemini
 *   ↓
 * funciona → devuelve resultado
 *
 * falla
 *   ↓
 * registra error
 *   ↓
 * NO usa OCR automáticamente
 *   ↓
 * lanza GeminiFallbackRequiredError
 */
export async function extraerComprobante(
  base64: string,
  mimeType: string,
  tipo: TipoComprobanteIA
): Promise<ComprobanteExtraido> {

  const logId = await crearLogIA({
    proveedorIA: "Gemini",
    iaSecundaria: "OCR.space",
  })

  try {

    const resultado =
      await extraerConGemini(
        base64,
        mimeType,
        tipo
      )

    await actualizarLogIA({
      logId: logId ?? "",
      estado: "exitoso",
      lineasDetectadas:
        resultado.lineas?.length ?? 0,
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

    console.warn(
      "Gemini falló. Se requiere autorización para utilizar OCR.space:",
      err
    )

    throw new GeminiFallbackRequiredError(
      mensaje,
      logId
    )
  }
}

/**
 * Ejecuta OCR.space solamente después
 * de que el usuario haya autorizado el fallback.
 */
export async function procesarConOCRAutorizado(
  base64: string,
  mimeType: string,
  tipo: TipoComprobanteIA,
  logGeminiId: string | null
): Promise<ComprobanteExtraido> {

  // Registramos que el usuario autorizó
  // pasar de Gemini a OCR.space.
  if (logGeminiId) {
    await actualizarLogIA({
      logId: logGeminiId,
      estado: "autorizado",
      accionUsuario:
        "Autorizó uso de OCR.space como alternativa",
    })
  }

  // Creamos un nuevo registro específico
  // para la intervención de OCR.space.
  const logOCRId =
    await crearLogIA({
      proveedorIA: "OCR.space",
    })

  try {

    const resultado =
      await extraerConOCRSpace(
        base64,
        mimeType,
        tipo
      )

    await actualizarLogIA({
      logId: logOCRId ?? "",
      estado: "exitoso",
      lineasDetectadas:
        resultado.lineas?.length ?? 0,
    })

    return resultado

  } catch (err) {

    const mensaje =
      err instanceof Error
        ? err.message
        : "Error desconocido al procesar con OCR.space"

    await actualizarLogIA({
      logId: logOCRId ?? "",
      estado: "error",
      motivoError: mensaje,
    })

    throw err
  }
}