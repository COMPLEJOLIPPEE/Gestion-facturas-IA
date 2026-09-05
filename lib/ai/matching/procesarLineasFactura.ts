import { SupabaseClient } from "@supabase/supabase-js"
import type { LineaExtraida } from "../tipos"
import { buscarAlias } from "./buscarAlias"
import { smartMatch } from "./smartMatch"

export type ProductoSistema = { id: string; nombre: string }
export type TipoBonificacionProcesada = "cantidad" | "importe" | "porcentaje"

export type LineaProcesada = {
  producto_id: string; cantidad: number; precio_unitario: number; iva: number; descuento: number; precio_final: number
  descuento_porcentaje?: number; tipo_descuento?: "porcentaje" | "importe"; descuentos?: { porcentaje?: number | null; importe?: number | null; descripcion?: string | null }[]
  bonificacion?: number; bonificacion_porcentaje?: number; cantidad_bonificada?: number; cantidad_bonificada_detalle?: number; tipo_bonificacion?: TipoBonificacionProcesada
  precio_bruto_unitario?: number; precio_neto?: number; subtotal_neto?: number; importe_linea?: number; iva_importe?: number; impuestos_internos?: number
  cargos?: { descripcion: string; importe: number }[]; columnas_presentes?: string[]; codigo_proveedor?: string; descripcionLeida: string
  autoMatcheado: boolean; score: number; confianza: "alta" | "media" | "baja"; motivo: string; fuente: "alias" | "smartmatch" | "manual"
  producto_sugerido_id?: string; producto_sugerido_nombre?: string; tipo_linea?: "producto" | "ajuste"; es_ajuste_negativo?: boolean
}

function numero(valor: unknown) { const n = Number(valor ?? 0); return Number.isFinite(n) ? n : 0 }
function redondear(valor: number) { return Number(valor.toFixed(2)) }
function cargosTotal(linea: LineaExtraida) { return (linea.cargos ?? []).reduce((s, c) => s + Math.abs(numero(c.importe)), 0) }
function textoEsPorcentaje(valor: unknown) { return typeof valor === "string" && /%|porcent/i.test(valor) }

function descuentoDesdeDetalle(linea: LineaExtraida, brutoOriginal: number) {
  const porcentajeDirecto = numero(linea.porcentaje_descuento)
  if (porcentajeDirecto !== 0) return { importe: brutoOriginal * Math.abs(porcentajeDirecto) / 100, porcentaje: Math.abs(porcentajeDirecto), tipo: "porcentaje" as const }
  const descuento = numero(linea.descuento)
  if (descuento !== 0 && textoEsPorcentaje(linea.tipo_descuento)) return { importe: brutoOriginal * Math.abs(descuento) / 100, porcentaje: Math.abs(descuento), tipo: "porcentaje" as const }
  if (descuento !== 0) return { importe: Math.abs(descuento), porcentaje: undefined, tipo: "importe" as const }
  if (!linea.descuentos?.length) return { importe: 0, porcentaje: undefined, tipo: undefined }
  let base = brutoOriginal
  let total = 0
  let porcentajeUltimo: number | undefined
  for (const detalle of linea.descuentos) {
    const importe = numero(detalle.importe)
    const porcentaje = Math.abs(numero(detalle.porcentaje))
    const reduccion = importe !== 0 ? Math.abs(importe) : base * porcentaje / 100
    total += reduccion
    base = Math.max(0, base - reduccion)
    if (porcentaje !== 0) porcentajeUltimo = porcentaje
  }
  return { importe: total, porcentaje: porcentajeUltimo, tipo: porcentajeUltimo != null && total > 0 ? "porcentaje" as const : "importe" as const }
}

function bonificacionDesdeDetalle(linea: LineaExtraida, precioOriginal: number, cantidad: number) {
  const tipo = String(linea.tipo_bonificacion ?? linea.bonificacion_tipo ?? "").toLowerCase()
  const valor = Math.abs(numero(linea.bonificacion_importe ?? linea.bonificacion))
  if (tipo.includes("porcentaje") || tipo.includes("percent") || tipo === "%") return { importe: cantidad * precioOriginal * valor / 100, porcentaje: valor, tipo: "porcentaje" as const }
  if (tipo === "cantidad") {
    const cantidadBonificada = Math.min(Math.max(0, numero(linea.cantidad_bonificada ?? linea.cantidad_bonificada_detalle)), cantidad)
    return { importe: cantidadBonificada * precioOriginal, porcentaje: undefined, tipo: "cantidad" as const, cantidadBonificada }
  }
  return { importe: valor, porcentaje: undefined, tipo: valor !== 0 ? "importe" as const : undefined }
}

function subtotalDesdeImporte(importeLinea: number, iva: number, impuestosInternos: number) {
  const base = Math.max(0, Math.abs(importeLinea) - Math.abs(impuestosInternos))
  return iva > 0 ? base / (1 + iva / 100) : base
}

function financieros(linea: LineaExtraida, negativo: boolean) {
  const cantidad = Math.max(1, numero(linea.cantidad ?? 1))
  const precioOriginal = Math.abs(numero(linea.precio_bruto_unitario ?? linea.precio_unitario))
  const brutoOriginal = cantidad * precioOriginal
  const cargo = cargosTotal(linea)
  const iva = numero(linea.iva ?? 21)
  const internos = Math.abs(numero(linea.impuestos_internos))
  const descuento = descuentoDesdeDetalle(linea, brutoOriginal)
  let bonificacion = bonificacionDesdeDetalle(linea, precioOriginal, cantidad)

  if (linea.importe_linea != null && Math.abs(numero(linea.importe_linea)) > 0 && brutoOriginal > 0) {
    const subtotalPorImporte = subtotalDesdeImporte(numero(linea.importe_linea), iva, internos)
    const reduccionPct = ((brutoOriginal + cargo - subtotalPorImporte) / brutoOriginal) * 100
    const valorBonif = Math.abs(numero(linea.bonificacion_importe ?? linea.bonificacion))
    if (bonificacion.tipo === "importe" && valorBonif > 0 && valorBonif <= 100 && Math.abs(reduccionPct - valorBonif) <= 0.75) {
      bonificacion = { importe: brutoOriginal * valorBonif / 100, porcentaje: valorBonif, tipo: "porcentaje" as const }
    }
  }

  if (negativo) {
    const importe = numero(linea.subtotal_neto) !== 0 ? -Math.abs(numero(linea.subtotal_neto)) : -(descuento.importe || bonificacion.importe || Math.abs(numero(linea.precio_unitario)))
    const ivaImporte = linea.iva_importe != null && numero(linea.iva_importe) !== 0 ? -Math.abs(numero(linea.iva_importe)) : redondear(importe * iva / 100)
    return {
      precio_bruto_unitario: redondear(importe), precio_neto: redondear(importe), subtotal_neto: redondear(importe), importe_linea: numero(linea.importe_linea) || undefined, iva_importe: redondear(ivaImporte),
      impuestos_internos: -internos, descuento: 0, descuento_porcentaje: undefined, tipo_descuento: undefined, descuentos: linea.descuentos ?? [],
      bonificacion: 0, bonificacion_porcentaje: undefined, cantidad_bonificada: undefined, cantidad_bonificada_detalle: undefined, tipo_bonificacion: undefined as TipoBonificacionProcesada | undefined,
    }
  }

  const brutoConCargo = brutoOriginal + cargo
  const subtotalImpreso = numero(linea.subtotal_neto)
  const netoUnitarioImpreso = numero(linea.precio_neto_unitario)
  const subtotalDesdeNetoUnitario = netoUnitarioImpreso > 0 ? netoUnitarioImpreso * cantidad : 0
  const subtotalImpresoValido = subtotalImpreso !== 0 ? Math.abs(subtotalImpreso) : 0
  const subtotalPorImporte = linea.importe_linea != null && Math.abs(numero(linea.importe_linea)) > 0 ? subtotalDesdeImporte(numero(linea.importe_linea), iva, internos) : 0
  const subtotalObjetivo = subtotalImpresoValido !== 0
    ? subtotalImpresoValido
    : subtotalDesdeNetoUnitario !== 0
      ? subtotalDesdeNetoUnitario
      : subtotalPorImporte !== 0
        ? subtotalPorImporte
        : Math.max(0, brutoConCargo - descuento.importe - bonificacion.importe)

  const reduccionTotal = Math.max(0, brutoConCargo - subtotalObjetivo)
  const descuentoNormalizado = Math.min(descuento.importe, reduccionTotal)
  const bonificacionNormalizada = Math.min(bonificacion.importe, Math.max(0, reduccionTotal - descuentoNormalizado))
  const precioInterno = cargo > 0 ? brutoConCargo / cantidad : precioOriginal
  const ivaImporte = linea.iva_importe != null && numero(linea.iva_importe) !== 0 ? Math.abs(numero(linea.iva_importe)) : redondear(subtotalObjetivo * iva / 100)
  const descuentoPct = descuento.porcentaje
  const tipoDescuento = descuentoPct != null ? "porcentaje" as const : (descuento.tipo === "importe" ? "importe" as const : undefined)

  return {
    precio_bruto_unitario: redondear(precioInterno), precio_neto: redondear(subtotalObjetivo / cantidad), subtotal_neto: redondear(subtotalObjetivo), importe_linea: numero(linea.importe_linea) || undefined, iva_importe: redondear(ivaImporte),
    impuestos_internos: internos, descuento: redondear(descuentoNormalizado), descuento_porcentaje: descuentoPct, tipo_descuento: tipoDescuento, descuentos: linea.descuentos ?? [],
    bonificacion: redondear(bonificacionNormalizada), bonificacion_porcentaje: bonificacion.porcentaje,
    cantidad_bonificada: numero(linea.cantidad_bonificada) || undefined, cantidad_bonificada_detalle: numero(linea.cantidad_bonificada_detalle) || undefined,
    tipo_bonificacion: bonificacion.tipo === "porcentaje" ? "porcentaje" : (bonificacion.tipo === "cantidad" ? "cantidad" : (linea.tipo_bonificacion ?? linea.bonificacion_tipo)) as TipoBonificacionProcesada | undefined,
  }
}

function crearLineaDescuento(linea: LineaExtraida): LineaProcesada {
  const importeExplicito = Math.max(Math.abs(numero(linea.subtotal_neto)), Math.abs(numero(linea.descuento)), Math.abs(numero(linea.bonificacion_importe ?? linea.bonificacion)), Math.abs(numero(linea.precio_unitario * Math.max(1, numero(linea.cantidad ?? 1)))))
  const iva = numero(linea.iva ?? 0)
  const ivaImporte = linea.iva_importe != null && numero(linea.iva_importe) !== 0 ? -Math.abs(numero(linea.iva_importe)) : redondear(-importeExplicito * iva / 100)
  const porcentaje = numero(linea.porcentaje_descuento) || (textoEsPorcentaje(linea.tipo_descuento) ? Math.abs(numero(linea.descuento)) : undefined)
  return {
    producto_id: "", cantidad: 1, precio_unitario: redondear(-importeExplicito), iva, descuento: 0, precio_final: redondear(-importeExplicito),
    precio_bruto_unitario: redondear(-importeExplicito), precio_neto: redondear(-importeExplicito), subtotal_neto: redondear(-importeExplicito), importe_linea: numero(linea.importe_linea) || undefined, iva_importe: ivaImporte,
    impuestos_internos: 0, descuentos: linea.descuentos ?? [], descuento_porcentaje: porcentaje, tipo_descuento: porcentaje != null ? "porcentaje" : undefined,
    bonificacion_porcentaje: linea.bonificacion_tipo === "porcentaje" ? Math.abs(numero(linea.bonificacion_importe ?? linea.bonificacion)) : undefined,
    bonificacion: 0, cantidad_bonificada: undefined, cantidad_bonificada_detalle: undefined, tipo_bonificacion: undefined,
    cargos: [], columnas_presentes: linea.columnas_presentes ?? [], descripcionLeida: linea.descripcion, autoMatcheado: false, score: 100,
    confianza: "alta", motivo: "Descuento/bonificación conservado como línea independiente. No se asocia ni se reparte entre productos.", fuente: "manual", codigo_proveedor: linea.codigo_proveedor ?? undefined,
    tipo_linea: "ajuste", es_ajuste_negativo: true,
  }
}

export async function procesarLineasFacturaIA(supabase: SupabaseClient, proveedorId: string | null, lineasIA: LineaExtraida[], productos: ProductoSistema[]): Promise<LineaProcesada[]> {
  const descuentos = lineasIA.filter((l) => l.tipo_linea === "descuento_linea" || l.tipo_linea === "descuento_agrupado")
  const productosIA = lineasIA.filter((l) => l.tipo_linea !== "descuento_linea" && l.tipo_linea !== "descuento_agrupado")
  const resultado: LineaProcesada[] = []

  for (const linea of productosIA) {
    const negativo = linea.tipo_linea === "ajuste" || linea.es_ajuste_negativo === true
    const financierosLinea = financieros(linea, negativo)
    const base = {
      cantidad: Math.max(0, numero(linea.cantidad)), precio_unitario: negativo ? -Math.abs(numero(linea.precio_unitario)) : Math.abs(numero(linea.precio_unitario)), iva: numero(linea.iva ?? 21),
      precio_final: financierosLinea.precio_neto, ...financierosLinea, cargos: linea.cargos ?? [], columnas_presentes: linea.columnas_presentes ?? [], descripcionLeida: linea.descripcion,
      codigo_proveedor: linea.codigo_proveedor ?? undefined, tipo_linea: negativo ? "ajuste" as const : "producto" as const, es_ajuste_negativo: negativo,
    }

    if (negativo) { resultado.push({ ...base, producto_id: "", autoMatcheado: false, score: 100, confianza: "alta", motivo: "Línea identificada como ajuste negativo; no requiere producto.", fuente: "manual" }); continue }
    const alias = proveedorId ? await buscarAlias(supabase, proveedorId, linea.descripcion, linea.codigo_proveedor) : null
    if (alias) { resultado.push({ ...base, producto_id: alias.producto_id, autoMatcheado: true, score: 100, confianza: "alta", motivo: "Producto reconocido mediante historial del proveedor.", fuente: "alias" }); continue }
    const match = smartMatch(linea.descripcion, productos)
    if (match.confianza === "alta" && match.producto) resultado.push({ ...base, producto_id: match.producto.id, autoMatcheado: true, score: match.score, confianza: "alta", motivo: match.motivo, fuente: "smartmatch" })
    else if (match.confianza === "media" && match.producto) resultado.push({ ...base, producto_id: "", autoMatcheado: false, score: match.score, confianza: "media", motivo: match.motivo, fuente: "smartmatch", producto_sugerido_id: match.producto.id, producto_sugerido_nombre: match.producto.nombre })
    else resultado.push({ ...base, producto_id: "", autoMatcheado: false, score: match.score, confianza: "baja", motivo: match.motivo, fuente: "smartmatch" })
  }

  for (const descuento of descuentos) resultado.push(crearLineaDescuento(descuento))
  return resultado
}
