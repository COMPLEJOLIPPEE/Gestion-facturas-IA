"use server"

import { createClient } from "@/lib/supabase/server"

import {
  extraerComprobante,
  procesarConOCRAutorizado,
  GeminiFallbackRequiredError,
} from "./extraer-comprobante"

import { procesarLineasIA } from "./matching/procesarLineasIA"

import type {
  ComprobanteExtraido,
} from "./tipos"

/**
 * Lee una factura utilizando Gemini.
 *
 * Si Gemini falla, NO utiliza OCR automáticamente.
 * Se lanza un error especial que contiene el ID
 * del log para que la interfaz pueda pedir autorización.
 */
export async function leerFacturaConIA(
  base64: string,
  mimeType: string
): Promise<ComprobanteExtraido> {

  try {

    return await extraerComprobante(
      base64,
      mimeType,
      "factura"
    )

  } catch (error) {

    if (
      error instanceof GeminiFallbackRequiredError
    ) {

      throw new Error(
        `GEMINI_FALLBACK_REQUIRED|${error.logId ?? ""}|${error.message}`
      )
    }

    throw error
  }
}

/**
 * Lee un remito utilizando Gemini.
 *
 * Si Gemini falla, tampoco utiliza OCR automáticamente.
 */
export async function leerRemitoConIA(
  base64: string,
  mimeType: string
): Promise<ComprobanteExtraido> {

  try {

    return await extraerComprobante(
      base64,
      mimeType,
      "remito"
    )

  } catch (error) {

    if (
      error instanceof GeminiFallbackRequiredError
    ) {

      throw new Error(
        `GEMINI_FALLBACK_REQUIRED|${error.logId ?? ""}|${error.message}`
      )
    }

    throw error
  }
}

/**
 * Procesa las líneas extraídas y busca
 * coincidencias con los productos existentes.
 */
export async function procesarLineasFacturaConIA(
  proveedorId: string | null,
  lineas: ComprobanteExtraido["lineas"],
  productos: {
    id: string
    nombre: string
  }[]
) {

  const supabase = await createClient()

  return procesarLineasIA(
    supabase,
    proveedorId,
    lineas,
    productos
  )
}

/**
 * Ejecuta OCR.space solamente después
 * de que el usuario haya autorizado el fallback.
 */
export async function usarOCRParaFactura(
  base64: string,
  mimeType: string,
  logId: string | null
): Promise<ComprobanteExtraido> {

  return procesarConOCRAutorizado(
    base64,
    mimeType,
    "factura",
    logId
  )
}

/**
 * Ejecuta OCR.space para un remito solamente
 * después de autorización del usuario.
 */
export async function usarOCRParaRemito(
  base64: string,
  mimeType: string,
  logId: string | null
): Promise<ComprobanteExtraido> {

  return procesarConOCRAutorizado(
    base64,
    mimeType,
    "remito",
    logId
  )
}