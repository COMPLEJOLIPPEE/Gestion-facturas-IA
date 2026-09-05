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
function valorOpcional(valor: unknown) { return valor == null || valor === "" ? undefined : numero(valor) }
function redondear(valor: number) { return Number(valor.toFixed(2)) }

function procesarValoresLeidos(linea: LineaExtraida, negativo: boolean) {
  const cantidad = Math.max(0, numero(linea.cantidad))
  const precioUnitarioLeido = Math.abs(numero(linea.precio_unitario))
  const precioBruto = valorOpcional(linea.precio_bruto_unitario)
  const precioNeto = valorOpcional(linea.precio_neto)
  const precioNetoUnitario = valorOpcional(linea.precio_neto_unitario)
  const subtotalNeto = valorOpcional(linea.subtotal_neto)
  const importeLinea = valorOpcional(linea.importe_linea)
  const ivaImporte = valorOpcional(linea.iva_importe)
  const impuestosInternos = valorOpcional(linea.impuestos_internos) ?? 0

  const descuento = valorOpcional(linea.descuento) ?? 0
  const bonificacion = valorOpcional(linea.bonificacion_importe ?? linea.bonificacion) ?? 0
  const descuentoPorcentaje = valorOpcional(linea.porcentaje_descuento)
  const tipoDescuento = descuentoPorcentaje != null
    ? "porcentaje" as const
    : linea.tipo_descuento === "importe"
      ? "importe" as const
      : linea.tipo_descuento === "porcentaje"
        ? "porcentaje" as const
        : undefined

  const tipoBonificacionRaw = String(linea.tipo_bonificacion ?? linea.bonificacion_tipo ?? "").toLowerCase()
  const tipoBonificacion = tipoBonificacionRaw.includes("porcentaje") || tipoBonificacionRaw === "%"
    ? "porcentaje" as const
    : tipoBonificacionRaw === "cantidad"
      ? "cantidad" as const
      : tipoBonificacionRaw === "importe"
        ? "importe" as const
        : undefined

  return {
    cantidad,
    precio_unitario: redondear(negativo ? -precioUnitarioLeido : precioUnitarioLeido),
    precio_bruto_unitario: precioBruto != null ? redondear(negativo ? -Math.abs(precioBruto) : Math.abs(precioBruto)) : undefined,
    precio_neto: precioNeto != null ? redondear(negativo ? -Math.abs(precioNeto) : Math.abs(precioNeto)) : undefined,
    precio_neto_unitario: precioNetoUnitario != null ? redondear(negativo ? -Math.abs(precioNetoUnitario) : Math.abs(precioNetoUnitario)) : undefined,
    subtotal_neto: subtotalNeto != null ? redondear(negativo ? -Math.abs(subtotalNeto) : Math.abs(subtotalNeto)) : undefined,
    importe_linea: importeLinea != null ? redondear(negativo ? -Math.abs(importeLinea) : Math.abs(importeLinea)) : undefined,
    iva_importe: ivaImporte != null ? redondear(negativo ? -Math.abs(ivaImporte) : Math.abs(ivaImporte)) : undefined,
    impuestos_internos: redondear(negativo ? -Math.abs(impuestosInternos) : Math.abs(impuestosInternos)),
    descuento: negativo ? 0 : redondear(Math.abs(descuento)),
    descuento_porcentaje: descuentoPorcentaje != null ? Math.abs(descuentoPorcentaje) : undefined,
    tipo_descuento: tipoDescuento,
    descuentos: linea.descuentos ?? [],
    bonificacion: negativo ? 0 : redondear(Math.abs(bonificacion)),
    bonificacion_porcentaje: linea.bonificacion_importe == null && tipoBonificacion === "porcentaje" ? Math.abs(numero(linea.bonificacion)) : undefined,
    cantidad_bonificada: valorOpcional(linea.cantidad_bonificada),
    cantidad_bonificada_detalle: valorOpcional(linea.cantidad_bonificada_detalle),
    tipo_bonificacion: tipoBonificacion,
    precio_final: precioNetoUnitario != null
      ? redondear(negativo ? -Math.abs(precioNetoUnitario) : Math.abs(precioNetoUnitario))
      : precioNeto != null
        ? redondear(negativo ? -Math.abs(precioNeto) : Math.abs(precioNeto))
        : redondear(negativo ? -precioUnitarioLeido : precioUnitarioLeido),
  }
}

function crearLineaAjuste(linea: LineaExtraida): LineaProcesada {
  const valores = procesarValoresLeidos(linea, true)
  return {
    producto_id: "", cantidad: valores.cantidad || 1, precio_unitario: valores.precio_unitario, iva: numero(linea.iva), descuento: 0, precio_final: valores.precio_final,
    ...valores, cargos: linea.cargos ?? [], columnas_presentes: linea.columnas_presentes ?? [], descripcionLeida: linea.descripcion,
    autoMatcheado: false, score: 100, confianza: "alta", motivo: "Línea de ajuste/descuento conservada exactamente como fue extraída; no se asocia a ningún producto.", fuente: "manual",
    codigo_proveedor: linea.codigo_proveedor ?? undefined, tipo_linea: "ajuste", es_ajuste_negativo: true,
  }
}

export async function procesarLineasFacturaIA(supabase: SupabaseClient, proveedorId: string | null, lineasIA: LineaExtraida[], productos: ProductoSistema[]): Promise<LineaProcesada[]> {
  const resultado: LineaProcesada[] = []

  for (const linea of lineasIA) {
    const negativo = linea.tipo_linea === "descuento_linea" || linea.tipo_linea === "descuento_agrupado" || linea.tipo_linea === "ajuste" || linea.es_ajuste_negativo === true
    if (negativo) {
      resultado.push(crearLineaAjuste(linea))
      continue
    }

    const valores = procesarValoresLeidos(linea, false)
    const base = {
      cantidad: valores.cantidad, precio_unitario: valores.precio_unitario, iva: numero(linea.iva ?? 0),
      precio_final: valores.precio_final, ...valores, cargos: linea.cargos ?? [], columnas_presentes: linea.columnas_presentes ?? [], descripcionLeida: linea.descripcion,
      codigo_proveedor: linea.codigo_proveedor ?? undefined, tipo_linea: "producto" as const, es_ajuste_negativo: false,
    }

    const alias = proveedorId ? await buscarAlias(supabase, proveedorId, linea.descripcion, linea.codigo_proveedor) : null
    if (alias) {
      resultado.push({ ...base, producto_id: alias.producto_id, autoMatcheado: true, score: 100, confianza: "alta", motivo: "Producto reconocido mediante historial del proveedor.", fuente: "alias" })
      continue
    }

    const match = smartMatch(linea.descripcion, productos)
    if (match.confianza === "alta" && match.producto) {
      resultado.push({ ...base, producto_id: match.producto.id, autoMatcheado: true, score: match.score, confianza: "alta", motivo: match.motivo, fuente: "smartmatch" })
    } else if (match.confianza === "media" && match.producto) {
      resultado.push({ ...base, producto_id: "", autoMatcheado: false, score: match.score, confianza: "media", motivo: match.motivo, fuente: "smartmatch", producto_sugerido_id: match.producto.id, producto_sugerido_nombre: match.producto.nombre })
    } else {
      resultado.push({ ...base, producto_id: "", autoMatcheado: false, score: match.score, confianza: "baja", motivo: match.motivo, fuente: "smartmatch" })
    }
  }

  return resultado
}
