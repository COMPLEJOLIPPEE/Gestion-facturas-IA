import { SupabaseClient } from "@supabase/supabase-js"
import type { LineaExtraida } from "../tipos"
import { buscarAlias } from "./buscarAlias"
import { smartMatch } from "./smartMatch"

export type ProductoSistema = { id: string; nombre: string }
export type TipoBonificacionProcesada = "cantidad" | "importe" | "porcentaje"

export type LineaProcesada = {
  producto_id: string; cantidad: number; precio_unitario: number; iva: number; descuento: number; precio_final: number
  bonificacion?: number; cantidad_bonificada?: number; cantidad_bonificada_detalle?: number; tipo_bonificacion?: TipoBonificacionProcesada
  precio_bruto_unitario?: number; precio_neto?: number; subtotal_neto?: number; iva_importe?: number; impuestos_internos?: number
  cargos?: { descripcion: string; importe: number }[]; columnas_presentes?: string[]; codigo_proveedor?: string; descripcionLeida: string
  autoMatcheado: boolean; score: number; confianza: "alta" | "media" | "baja"; motivo: string; fuente: "alias" | "smartmatch" | "manual"
  producto_sugerido_id?: string; producto_sugerido_nombre?: string; tipo_linea?: "producto" | "ajuste"; es_ajuste_negativo?: boolean
}

function numero(valor: unknown) { const n = Number(valor ?? 0); return Number.isFinite(n) ? n : 0 }
function redondear(valor: number) { return Number(valor.toFixed(2)) }
function cargosTotal(linea: LineaExtraida) { return (linea.cargos ?? []).reduce((s, c) => s + Math.abs(numero(c.importe)), 0) }

function descuentoDesdeDetalle(linea: LineaExtraida, brutoOriginal: number) {
  if (numero(linea.descuento) !== 0) return Math.abs(numero(linea.descuento))
  if (numero(linea.porcentaje_descuento) !== 0) return brutoOriginal * Math.abs(numero(linea.porcentaje_descuento)) / 100
  if (!linea.descuentos?.length) return 0

  let base = brutoOriginal
  let total = 0
  for (const descuento of linea.descuentos) {
    const importe = numero(descuento.importe)
    const porcentaje = Math.abs(numero(descuento.porcentaje))
    const reduccion = importe > 0 ? importe : base * porcentaje / 100
    total += reduccion
    base = Math.max(0, base - reduccion)
  }
  return total
}

function financieros(linea: LineaExtraida, negativo: boolean) {
  const cantidad = Math.max(1, numero(linea.cantidad ?? 1))
  const precioOriginal = Math.abs(numero(linea.precio_bruto_unitario ?? linea.precio_unitario))
  const brutoOriginal = cantidad * precioOriginal
  const cargo = cargosTotal(linea)
  const descuentoInformado = descuentoDesdeDetalle(linea, brutoOriginal)
  const bonificacionCantidad = linea.tipo_bonificacion === "cantidad"
    ? Math.min(Math.max(0, numero(linea.cantidad_bonificada ?? linea.cantidad_bonificada_detalle)), cantidad) * precioOriginal
    : 0
  const bonificacionInformada = Math.abs(numero(linea.bonificacion_importe ?? linea.bonificacion))
  const bonificacionTotal = bonificacionInformada || bonificacionCantidad

  if (negativo) {
    const importe = numero(linea.subtotal_neto) !== 0
      ? -Math.abs(numero(linea.subtotal_neto))
      : -(descuentoInformado || bonificacionInformada || Math.abs(numero(linea.precio_unitario)))
    const iva = numero(linea.iva ?? 0)
    const ivaImporte = linea.iva_importe != null && numero(linea.iva_importe) !== 0
      ? -Math.abs(numero(linea.iva_importe))
      : redondear(importe * iva / 100)
    return {
      precio_bruto_unitario: redondear(importe), precio_neto: redondear(importe), subtotal_neto: redondear(importe), iva_importe: redondear(ivaImporte),
      impuestos_internos: -Math.abs(numero(linea.impuestos_internos)), descuento: 0, bonificacion: 0,
      cantidad_bonificada: undefined, cantidad_bonificada_detalle: undefined, tipo_bonificacion: undefined as TipoBonificacionProcesada | undefined,
    }
  }

  const brutoConCargo = brutoOriginal + cargo
  const subtotalImpreso = numero(linea.subtotal_neto)
  const netoUnitarioImpreso = numero(linea.precio_neto_unitario)
  const subtotalDesdeNetoUnitario = netoUnitarioImpreso > 0 ? netoUnitarioImpreso * cantidad : 0
  const subtotalObjetivo = subtotalImpreso !== 0
    ? Math.abs(subtotalImpreso)
    : subtotalDesdeNetoUnitario !== 0
      ? subtotalDesdeNetoUnitario
      : Math.max(0, brutoConCargo - descuentoInformado - bonificacionTotal)

  const reduccionTotal = Math.max(0, brutoConCargo - subtotalObjetivo)
  const descuentoNormalizado = Math.min(descuentoInformado, reduccionTotal)
  const bonificacionNormalizada = Math.min(bonificacionTotal, Math.max(0, reduccionTotal - descuentoNormalizado))
  const precioInterno = cargo > 0 ? brutoConCargo / cantidad : precioOriginal
  const iva = numero(linea.iva ?? 21)
  const ivaImporte = linea.iva_importe != null && numero(linea.iva_importe) !== 0
    ? Math.abs(numero(linea.iva_importe))
    : redondear(subtotalObjetivo * iva / 100)
  const bonificacionEsCantidad = linea.tipo_bonificacion === "cantidad"

  return {
    precio_bruto_unitario: redondear(precioInterno), precio_neto: redondear(subtotalObjetivo / cantidad), subtotal_neto: redondear(subtotalObjetivo), iva_importe: redondear(ivaImporte),
    impuestos_internos: Math.abs(numero(linea.impuestos_internos)), descuento: redondear(descuentoNormalizado), bonificacion: redondear(bonificacionNormalizada),
    cantidad_bonificada: numero(linea.cantidad_bonificada) || undefined, cantidad_bonificada_detalle: numero(linea.cantidad_bonificada_detalle) || undefined,
    tipo_bonificacion: bonificacionEsCantidad ? "importe" as const : (linea.tipo_bonificacion ?? linea.bonificacion_tipo) as TipoBonificacionProcesada | undefined,
  }
}

function crearLineaDescuento(linea: LineaExtraida): LineaProcesada {
  const importeExplicito = Math.max(
    Math.abs(numero(linea.subtotal_neto)), Math.abs(numero(linea.descuento)),
    Math.abs(numero(linea.bonificacion_importe ?? linea.bonificacion)),
    Math.abs(numero(linea.precio_unitario * Math.max(1, numero(linea.cantidad ?? 1))))
  )
  const ivaImporte = Math.abs(numero(linea.iva_importe))
  return {
    producto_id: "", cantidad: 1, precio_unitario: redondear(-importeExplicito), iva: numero(linea.iva ?? 0), descuento: 0, precio_final: redondear(-importeExplicito),
    precio_bruto_unitario: redondear(-importeExplicito), precio_neto: redondear(-importeExplicito), subtotal_neto: redondear(-importeExplicito), iva_importe: ivaImporte ? redondear(-ivaImporte) : 0,
    impuestos_internos: 0, cargos: [], columnas_presentes: linea.columnas_presentes ?? [], descripcionLeida: linea.descripcion, autoMatcheado: false, score: 100,
    confianza: "alta", motivo: "Descuento/bonificación conservado como línea independiente. No se asocia ni se reparte entre productos.", fuente: "manual", codigo_proveedor: linea.codigo_proveedor ?? undefined, tipo_linea: "ajuste", es_ajuste_negativo: true,
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
