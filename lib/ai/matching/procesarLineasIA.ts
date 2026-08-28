import { SupabaseClient } from "@supabase/supabase-js";
import type { LineaExtraida } from "../tipos";
import { buscarAlias } from "./buscarAlias";
import { smartMatch } from "./smartMatch";

export type LineaIA = LineaExtraida;
export type TipoBonificacionProcesada = "cantidad" | "importe" | "porcentaje";
export type ProductoSistema = { id: string; nombre: string };

export type LineaProcesada = {
  producto_id: string; cantidad: number; precio_unitario: number; iva: number; descuento: number; precio_final: number;
  bonificacion?: number; cantidad_bonificada?: number; cantidad_bonificada_detalle?: number; tipo_bonificacion?: TipoBonificacionProcesada;
  precio_bruto_unitario?: number; precio_neto?: number; subtotal_neto?: number; iva_importe?: number; impuestos_internos?: number;
  codigo_proveedor?: string; descripcionLeida: string; autoMatcheado: boolean; score: number;
  confianza: "alta" | "media" | "baja"; motivo: string; fuente: "alias" | "smartmatch" | "manual";
  producto_sugerido_id?: string; producto_sugerido_nombre?: string; tipo_linea?: "producto" | "ajuste"; es_ajuste_negativo?: boolean;
};

function normalizarTipoBonificacion(valor: string | null | undefined): TipoBonificacionProcesada | undefined {
  if (valor === "cantidad" || valor === "importe" || valor === "porcentaje") return valor;
  return undefined;
}
function numero(valor: unknown) { const resultado = Number(valor ?? 0); return Number.isFinite(resultado) ? resultado : 0; }
function redondear(valor: number) { return Number(valor.toFixed(2)); }

function datosFinancieros(linea: LineaIA, esAjusteNegativo: boolean) {
  if (esAjusteNegativo) {
    const precio = -Math.abs(numero(linea.precio_bruto_unitario ?? linea.precio_unitario));
    const cantidad = Math.max(1, numero(linea.cantidad ?? 1));
    const subtotal = linea.subtotal_neto != null ? -Math.abs(numero(linea.subtotal_neto)) : redondear(cantidad * precio);
    // No confiamos en un IVA de línea que pueda haber sido leído desde otra columna.
    // Para un ajuste negativo calculamos el IVA sobre su base neta y su alícuota.
    const tasaIVA = numero(linea.iva ?? 21);
    const ivaImporte = redondear(subtotal * (tasaIVA / 100));
    const impuestosInternos = linea.impuestos_internos != null ? -Math.abs(numero(linea.impuestos_internos)) : 0;
    return { precio_bruto_unitario: redondear(precio), precio_neto: cantidad > 0 ? redondear(subtotal / cantidad) : redondear(precio), subtotal_neto: redondear(subtotal), iva_importe: ivaImporte, impuestos_internos: redondear(impuestosInternos), bonificacion: undefined, cantidad_bonificada: undefined, cantidad_bonificada_detalle: undefined, tipo_bonificacion: undefined };
  }

  const precioBrutoUnitario = linea.precio_bruto_unitario != null ? Math.abs(numero(linea.precio_bruto_unitario)) : Math.abs(numero(linea.precio_unitario ?? 0));
  const cantidad = Math.max(0, numero(linea.cantidad ?? 0));
  const descuento = Math.abs(numero(linea.descuento ?? 0));
  const bonificacion = linea.bonificacion != null ? Math.abs(numero(linea.bonificacion)) : 0;
  const cantidadBonificada = Math.max(0, numero(linea.cantidad_bonificada ?? linea.cantidad_bonificada_detalle ?? 0));
  const bonificacionCantidad = linea.tipo_bonificacion === "cantidad" ? cantidadBonificada * precioBrutoUnitario : 0;
  const subtotalCalculado = Math.max(0, cantidad * precioBrutoUnitario - descuento - bonificacion - bonificacionCantidad);
  const subtotalNeto = linea.subtotal_neto != null ? Math.abs(numero(linea.subtotal_neto)) : subtotalCalculado;
  const precioNeto = linea.precio_neto != null ? Math.abs(numero(linea.precio_neto)) : cantidad > 0 ? subtotalNeto / cantidad : 0;
  const iva = numero(linea.iva ?? 21);
  const ivaImporte = linea.iva_importe != null ? Math.abs(numero(linea.iva_importe)) : subtotalNeto * (iva / 100);
  return { bonificacion: bonificacion || undefined, cantidad_bonificada: cantidadBonificada || undefined, cantidad_bonificada_detalle: linea.cantidad_bonificada_detalle != null ? Math.max(0, numero(linea.cantidad_bonificada_detalle)) : undefined, tipo_bonificacion: normalizarTipoBonificacion(linea.tipo_bonificacion), precio_bruto_unitario: redondear(precioBrutoUnitario), precio_neto: redondear(precioNeto), subtotal_neto: redondear(subtotalNeto), iva_importe: redondear(ivaImporte), impuestos_internos: linea.impuestos_internos != null ? Math.abs(numero(linea.impuestos_internos)) : 0 };
}

export async function procesarLineasIA(supabase: SupabaseClient, proveedorId: string | null, lineasIA: LineaIA[], productos: ProductoSistema[]): Promise<LineaProcesada[]> {
  const resultado: LineaProcesada[] = [];
  for (const linea of lineasIA) {
    if (linea.tipo_linea === "descuento_linea" || linea.tipo_linea === "descuento_agrupado") continue;
    const esAjusteNegativo = linea.es_ajuste_negativo === true || linea.tipo_linea === "ajuste";
    const iva = numero(linea.iva ?? 21);
    const financieros = datosFinancieros(linea, esAjusteNegativo);
    const precioUnitario = financieros.precio_bruto_unitario ?? (esAjusteNegativo ? -Math.abs(numero(linea.precio_unitario)) : Math.abs(numero(linea.precio_unitario)));

    if (esAjusteNegativo) {
      resultado.push({ producto_id: "", cantidad: Math.max(1, numero(linea.cantidad ?? 1)), precio_unitario: precioUnitario, iva, descuento: 0, precio_final: financieros.precio_neto ?? precioUnitario, ...financieros, descripcionLeida: linea.descripcion, autoMatcheado: false, score: 100, confianza: "alta", motivo: "Línea identificada como ajuste negativo; no requiere producto.", fuente: "manual", tipo_linea: "ajuste", es_ajuste_negativo: true, codigo_proveedor: linea.codigo_proveedor ?? undefined });
      continue;
    }

    const alias = proveedorId ? await buscarAlias(supabase, proveedorId, linea.descripcion, linea.codigo_proveedor) : null;
    const base: Omit<LineaProcesada, "producto_id" | "autoMatcheado" | "score" | "confianza" | "motivo" | "fuente" | "producto_sugerido_id" | "producto_sugerido_nombre"> = { cantidad: Math.max(0, numero(linea.cantidad ?? 0)), precio_unitario: precioUnitario, iva, descuento: Math.abs(numero(linea.descuento ?? 0)), precio_final: Math.abs(numero(linea.precio_final ?? financieros.precio_neto ?? 0)), ...financieros, descripcionLeida: linea.descripcion, codigo_proveedor: linea.codigo_proveedor ?? undefined, tipo_linea: "producto", es_ajuste_negativo: false };

    if (alias) { resultado.push({ ...base, producto_id: alias.producto_id, autoMatcheado: true, score: 100, confianza: "alta", motivo: "Producto reconocido mediante historial del proveedor.", fuente: "alias" }); continue; }
    const match = smartMatch(linea.descripcion, productos);
    if (match.confianza === "alta" && match.producto) { resultado.push({ ...base, producto_id: match.producto.id, autoMatcheado: true, score: match.score, confianza: "alta", motivo: match.motivo, fuente: "smartmatch" }); continue; }
    if (match.confianza === "media" && match.producto) { resultado.push({ ...base, producto_id: "", autoMatcheado: false, score: match.score, confianza: "media", motivo: match.motivo, fuente: "smartmatch", producto_sugerido_id: match.producto.id, producto_sugerido_nombre: match.producto.nombre }); continue; }
    resultado.push({ ...base, producto_id: "", autoMatcheado: false, score: match.score, confianza: "baja", motivo: match.motivo, fuente: "smartmatch" });
  }
  return resultado;
}
