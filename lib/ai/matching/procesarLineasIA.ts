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
function normalizarTexto(valor: string) {
  return valor.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Normaliza marcas/abreviaturas y presentaciones que suelen cambiar entre
 * la descripción del descuento y la descripción real del producto.
 * Ej.: PWD / POW / POWER / POWERADE -> POWERADE
 *      500X6 / 500 ML -> 500
 *      1.5L / 1.500 -> 1500
 */
function normalizarConceptoDescuento(valor: string) {
  let texto = normalizarTexto(valor)
    .replace(/\bpow(?:erade)?\b/g, "powerade")
    .replace(/\bpwd\b/g, "powerade")
    .replace(/\bpower\b/g, "powerade")
    .replace(/\b1\s*[.,]?\s*5\s*l\b/g, "1500")
    .replace(/\b1\s*[.,]\s*500\b/g, "1500")
    .replace(/\b1500\s*ml\b/g, "1500")
    .replace(/\b500\s*ml\b/g, "500")
    .replace(/\b(\d+)\s*x\s*(\d+)\b/g, "$1 $2")
    .replace(/\b(caj|caja|cajas|unidad|unid|u)\b/g, " ")
    .replace(/\bpdv\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return texto;
}

function tokens(valor: string) {
  return normalizarConceptoDescuento(valor).split(" ").filter((token) => token.length >= 2);
}

function coincideConceptoDescuento(descripcionProducto: string, objetivo: string) {
  const producto = normalizarConceptoDescuento(descripcionProducto);
  const objetivoNormalizado = normalizarConceptoDescuento(objetivo);
  if (!producto || !objetivoNormalizado) return false;
  if (producto.includes(objetivoNormalizado) || objetivoNormalizado.includes(producto)) return true;

  const objetivoTokens = tokens(objetivoNormalizado);
  const productoTokens = new Set(tokens(producto));
  if (!objetivoTokens.length) return false;

  // Para descuentos agrupados usamos los tokens significativos como mínimo:
  // "30 Power 500" debe encontrar "PWD ... 500X6" y "PWD ... 500 ML".
  const coincidencias = objetivoTokens.filter((token) => productoTokens.has(token));
  return coincidencias.length === objetivoTokens.length;
}

function datosFinancieros(linea: LineaIA, esAjusteNegativo: boolean, descuentoForzado?: number) {
  if (esAjusteNegativo) {
    const precio = -Math.abs(numero(linea.precio_bruto_unitario ?? linea.precio_unitario));
    const cantidad = Math.max(1, numero(linea.cantidad ?? 1));
    const subtotal = linea.subtotal_neto != null ? -Math.abs(numero(linea.subtotal_neto)) : redondear(cantidad * precio);
    const tasaIVA = numero(linea.iva ?? 21);
    const ivaImporte = redondear(subtotal * (tasaIVA / 100));
    const impuestosInternos = linea.impuestos_internos != null ? -Math.abs(numero(linea.impuestos_internos)) : 0;
    return { precio_bruto_unitario: redondear(precio), precio_neto: cantidad > 0 ? redondear(subtotal / cantidad) : redondear(precio), subtotal_neto: redondear(subtotal), iva_importe: ivaImporte, impuestos_internos: redondear(impuestosInternos), bonificacion: undefined, cantidad_bonificada: undefined, cantidad_bonificada_detalle: undefined, tipo_bonificacion: undefined };
  }

  const precioBrutoUnitario = linea.precio_bruto_unitario != null ? Math.abs(numero(linea.precio_bruto_unitario)) : Math.abs(numero(linea.precio_unitario ?? 0));
  const cantidad = Math.max(0, numero(linea.cantidad ?? 0));
  const descuento = descuentoForzado != null ? Math.max(0, descuentoForzado) : Math.abs(numero(linea.descuento ?? 0));
  const bonificacion = linea.bonificacion != null ? Math.abs(numero(linea.bonificacion)) : 0;
  const cantidadBonificada = Math.max(0, numero(linea.cantidad_bonificada ?? linea.cantidad_bonificada_detalle ?? 0));
  const bonificacionCantidad = linea.tipo_bonificacion === "cantidad" ? cantidadBonificada * precioBrutoUnitario : 0;
  const subtotalCalculado = Math.max(0, cantidad * precioBrutoUnitario - descuento - bonificacion - bonificacionCantidad);
  const subtotalNeto = descuentoForzado != null ? redondear(subtotalCalculado) : (linea.subtotal_neto != null ? Math.abs(numero(linea.subtotal_neto)) : subtotalCalculado);
  const precioNeto = descuentoForzado != null ? (cantidad > 0 ? subtotalNeto / cantidad : 0) : (linea.precio_neto != null ? Math.abs(numero(linea.precio_neto)) : cantidad > 0 ? subtotalNeto / cantidad : 0);
  const iva = numero(linea.iva ?? 21);
  const ivaImporte = descuentoForzado != null ? redondear(subtotalNeto * (iva / 100)) : (linea.iva_importe != null ? Math.abs(numero(linea.iva_importe)) : subtotalNeto * (iva / 100));
  return { bonificacion: bonificacion || undefined, cantidad_bonificada: cantidadBonificada || undefined, cantidad_bonificada_detalle: linea.cantidad_bonificada_detalle != null ? Math.max(0, numero(linea.cantidad_bonificada_detalle)) : undefined, tipo_bonificacion: normalizarTipoBonificacion(linea.tipo_bonificacion), precio_bruto_unitario: redondear(precioBrutoUnitario), precio_neto: redondear(precioNeto), subtotal_neto: redondear(subtotalNeto), iva_importe: redondear(ivaImporte), impuestos_internos: linea.impuestos_internos != null ? Math.abs(numero(linea.impuestos_internos)) : 0 };
}

function extraerDescripcionObjetivo(descuento: LineaIA) {
  if (descuento.aplica_a_descripciones?.length) return descuento.aplica_a_descripciones.map(normalizarConceptoDescuento).filter(Boolean);
  const texto = normalizarTexto(descuento.descripcion);
  const sinPorcentaje = texto.replace(/\b\d+(?:[.,]\d+)?\s*%?\b/g, " ");
  const objetivo = sinPorcentaje.replace(/\b(descuento|descuento de|off|dto|bonificacion|bonificacion)\b/g, " ").replace(/\s+/g, " ").trim();
  return objetivo ? [normalizarConceptoDescuento(objetivo)] : [];
}

function coincideObjetivo(linea: LineaProcesada, objetivos: string[]) {
  if (!objetivos.length) return false;
  return objetivos.some((objetivo) => coincideConceptoDescuento(linea.descripcionLeida, objetivo));
}

function obtenerDescuentoAgrupado(descuento: LineaIA, linea: LineaProcesada) {
  const base = Math.max(0, numero(linea.cantidad) * Math.abs(numero(linea.precio_bruto_unitario ?? linea.precio_unitario)));
  const porcentaje = descuento.porcentaje_descuento != null
    ? numero(descuento.porcentaje_descuento)
    : descuento.descuentos?.find((d) => d.porcentaje != null)?.porcentaje != null
      ? numero(descuento.descuentos.find((d) => d.porcentaje != null)?.porcentaje)
      : null;
  if (porcentaje != null && porcentaje > 0) return redondear(base * porcentaje / 100);
  const importe = descuento.descuento != null
    ? numero(descuento.descuento)
    : descuento.descuentos?.find((d) => d.importe != null)?.importe != null
      ? numero(descuento.descuentos.find((d) => d.importe != null)?.importe)
      : 0;
  return redondear(Math.min(base, Math.abs(importe)));
}

export async function procesarLineasIA(supabase: SupabaseClient, proveedorId: string | null, lineasIA: LineaIA[], productos: ProductoSistema[]): Promise<LineaProcesada[]> {
  const resultado: LineaProcesada[] = [];
  const descuentosAgrupados = lineasIA.filter((linea) => linea.tipo_linea === "descuento_linea" || linea.tipo_linea === "descuento_agrupado");

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

  for (const descuento of descuentosAgrupados) {
    const objetivos = extraerDescripcionObjetivo(descuento);
    const candidatas = resultado.filter((linea) => linea.tipo_linea === "producto" && coincideObjetivo(linea, objetivos));
    for (const linea of candidatas) {
      const descuentoImporte = obtenerDescuentoAgrupado(descuento, linea);
      if (descuentoImporte <= 0) continue;
      const financieros = datosFinancieros({
        ...linea,
        descripcion: linea.descripcionLeida,
        descuento: descuentoImporte,
        subtotal_neto: undefined,
        precio_neto: undefined,
        iva_importe: undefined,
      }, false, descuentoImporte);
      linea.descuento = redondear(numero(linea.descuento) + descuentoImporte);
      linea.precio_final = financieros.precio_neto ?? linea.precio_final;
      Object.assign(linea, financieros);
      linea.motivo = `${linea.motivo} Descuento agrupado aplicado: ${descuento.descripcion}.`;
    }
  }

  return resultado;
}
