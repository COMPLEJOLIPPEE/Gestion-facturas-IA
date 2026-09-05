"use server"

import { createClient } from "@/lib/supabase/server"
import {
  extraerComprobante,
  procesarConOpenAIAutorizado,
  GeminiFallbackRequiredError,
} from "./extraer-comprobante"
import { procesarLineasFacturaIA } from "./matching/procesarLineasFactura"
import type { ComprobanteExtraido, CargoExtraido } from "./tipos"

function numero(valor: unknown) {
  const resultado = Number(valor ?? 0)
  return Number.isFinite(resultado) ? resultado : 0
}

function redondear(valor: number) {
  return Number(valor.toFixed(2))
}

function normalizarTexto(valor: string) {
  return valor.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()
}

function normalizarCargos(datos: ComprobanteExtraido): ComprobanteExtraido {
  const cargos: CargoExtraido[] = []
  const vistos = new Set<string>()

  for (const cargo of [
    ...(datos.cargos ?? []),
    ...(datos.percepciones ?? []),
    ...(datos.otros_cargos ?? []),
  ]) {
    const descripcion = String(cargo.descripcion ?? "").trim()
    const importe = numero(cargo.importe)
    if (!descripcion || !Number.isFinite(importe) || Math.abs(importe) <= 0.0001) continue
    const clave = `${normalizarTexto(descripcion)}|${redondear(importe).toFixed(2)}`
    if (vistos.has(clave)) continue
    vistos.add(clave)
    cargos.push({ descripcion, importe: redondear(importe) })
  }

  return { ...datos, cargos }
}

export async function leerFacturaConIA(base64: string, mimeType: string): Promise<ComprobanteExtraido> {
  try {
    const datos = await extraerComprobante(base64, mimeType, "factura")
    return normalizarCargos(datos)
  } catch (error) {
    if (error instanceof GeminiFallbackRequiredError) throw new Error(`GEMINI_FALLBACK_REQUIRED|${error.logId ?? ""}|${error.message}`)
    throw error
  }
}

export async function leerRemitoConIA(base64: string, mimeType: string): Promise<ComprobanteExtraido> {
  try {
    const datos = await extraerComprobante(base64, mimeType, "remito")
    return normalizarCargos(datos)
  } catch (error) {
    if (error instanceof GeminiFallbackRequiredError) throw new Error(`GEMINI_FALLBACK_REQUIRED|${error.logId ?? ""}|${error.message}`)
    throw error
  }
}

export async function procesarLineasFacturaConIA(
  proveedorId: string | null,
  lineas: ComprobanteExtraido["lineas"],
  productos: { id: string; nombre: string }[]
) {
  const supabase = await createClient()
  let catalogo = productos
  const { data: productosBD, error: errorProductos } = await supabase.from("productos").select("id, nombre").order("nombre")
  if (!errorProductos && productosBD && productosBD.length > 0) catalogo = productosBD
  return procesarLineasFacturaIA(supabase, proveedorId, lineas, catalogo)
}

export async function usarGPTParaFactura(base64: string, mimeType: string, logId: string | null): Promise<ComprobanteExtraido> {
  const datos = await procesarConOpenAIAutorizado(base64, mimeType, "factura", logId)
  return normalizarCargos(datos)
}

export async function usarGPTParaRemito(base64: string, mimeType: string, logId: string | null): Promise<ComprobanteExtraido> {
  const datos = await procesarConOpenAIAutorizado(base64, mimeType, "remito", logId)
  return normalizarCargos(datos)
}
