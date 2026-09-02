"use server"

import { createClient } from "@/lib/supabase/server"

import {
  extraerComprobante,
  procesarConOpenAIAutorizado,
  GeminiFallbackRequiredError,
} from "./extraer-comprobante"

import { procesarLineasIA } from "./matching/procesarLineasIA"

import type {
  ComprobanteExtraido,
} from "./tipos"

function numero(valor: unknown) {
  const resultado = Number(valor ?? 0)
  return Number.isFinite(resultado) ? resultado : 0
}

function normalizarTexto(valor: string) {
  return valor.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()
}

function asegurarImpuestosInternosEnCargos(datos: ComprobanteExtraido): ComprobanteExtraido {
  const importeTotal = Math.abs(numero(datos.impuestos_internos_total))
  if (importeTotal <= 0) return datos

  const cargosActuales = [...(datos.cargos ?? [])]
  const yaExisteCargoInterno = cargosActuales.some((cargo) => {
    const descripcion = normalizarTexto(cargo.descripcion)
    return descripcion.includes("impuesto interno") || descripcion.includes("impuestos internos") || descripcion.includes("imp interno") || descripcion.includes("imp internos")
  })

  if (yaExisteCargoInterno) return datos

  // Si Gemini ya identificó impuestos internos por línea, no debemos volver
  // a sumar el total completo como cargo: eso duplicaría el importe.
  const impuestosPorLinea = (datos.lineas ?? []).reduce(
    (suma, linea) => suma + Math.abs(numero(linea.impuestos_internos)),
    0
  )

  const diferencia = importeTotal - impuestosPorLinea
  if (impuestosPorLinea > 0 && diferencia <= 0.5) return datos

  // Si faltó una parte del impuesto en las líneas, solo agregamos el residual.
  // Si no hubo ningún impuesto por línea, agregamos el total completo.
  const importeCargo = impuestosPorLinea > 0
    ? Math.max(0, diferencia)
    : importeTotal

  if (importeCargo <= 0.01) return datos

  cargosActuales.push({
    descripcion: "Impuestos internos",
    importe: redondear(importeCargo),
  })

  return { ...datos, cargos: cargosActuales }
}

function redondear(valor: number) {
  return Number(valor.toFixed(2))
}

/**
 * Lee una factura utilizando Gemini.
 *
 * Si Gemini falla, NO utiliza GPT automáticamente.
 * Se lanza un error especial que contiene el ID
 * del log para que la interfaz pueda pedir autorización.
 */
export async function leerFacturaConIA(
  base64: string,
  mimeType: string
): Promise<ComprobanteExtraido> {
  try {
    const datos = await extraerComprobante(base64, mimeType, "factura")
    return asegurarImpuestosInternosEnCargos(datos)
  } catch (error) {
    if (error instanceof GeminiFallbackRequiredError) {
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
 * Si Gemini falla, tampoco utiliza GPT automáticamente.
 */
export async function leerRemitoConIA(
  base64: string,
  mimeType: string
): Promise<ComprobanteExtraido> {
  try {
    const datos = await extraerComprobante(base64, mimeType, "remito")
    return asegurarImpuestosInternosEnCargos(datos)
  } catch (error) {
    if (error instanceof GeminiFallbackRequiredError) {
      throw new Error(
        `GEMINI_FALLBACK_REQUIRED|${error.logId ?? ""}|${error.message}`
      )
    }

    throw error
  }
}

export async function procesarLineasFacturaConIA(
  proveedorId: string | null,
  lineas: ComprobanteExtraido["lineas"],
  productos: {
    id: string
    nombre: string
  }[]
) {
  const supabase = await createClient()

  // El catálogo de Supabase es la fuente de verdad para el matching.
  // No dependemos de que el Server Component haya podido hidratar el
  // catálogo en el navegador. Si la lista recibida está vacía o desactualizada,
  // la recuperamos directamente desde la base.
  let catalogo = productos
  const { data: productosBD, error: errorProductos } = await supabase
    .from("productos")
    .select("id, nombre")
    .order("nombre")

  if (!errorProductos && productosBD && productosBD.length > 0) {
    catalogo = productosBD
  }

  return procesarLineasIA(
    supabase,
    proveedorId,
    lineas,
    catalogo
  )
}

/**
 * Ejecuta GPT-4o-mini solamente después
 * de que el usuario haya autorizado el fallback.
 */
export async function usarGPTParaFactura(
  base64: string,
  mimeType: string,
  logId: string | null
): Promise<ComprobanteExtraido> {
  const datos = await procesarConOpenAIAutorizado(
    base64,
    mimeType,
    "factura",
    logId
  )
  return asegurarImpuestosInternosEnCargos(datos)
}

/**
 * Ejecuta GPT-4o-mini para un remito solamente
 * después de autorización del usuario.
 */
export async function usarGPTParaRemito(
  base64: string,
  mimeType: string,
  logId: string | null
): Promise<ComprobanteExtraido> {
  const datos = await procesarConOpenAIAutorizado(
    base64,
    mimeType,
    "remito",
    logId
  )
  return asegurarImpuestosInternosEnCargos(datos)
}
