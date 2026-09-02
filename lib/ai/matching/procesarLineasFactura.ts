import { SupabaseClient } from "@supabase/supabase-js"
import type { LineaExtraida } from "../tipos"
import { buscarAlias } from "./buscarAlias"
import { smartMatch } from "./smartMatch"

export type ProductoSistema = { id: string; nombre: string }
export type TipoBonificacionProcesada = "cantidad" | "importe" | "porcentaje"

export type LineaProcesada = {
  producto_id: string
  cantidad: number
  precio_unitario: number
  iva: number
  descuento: number
  precio_final: number
  bonificacion?: number
  cantidad_bonificada?: number
  cantidad_bonificada_detalle?: number
  tipo_bonificacion?: TipoBonificacionProcesada
  precio_bruto_unitario?: number
  precio_neto?: number
  subtotal_neto?: number
  iva_importe?: number
  impuestos_internos?: number
  codigo_proveedor?: string
  descripcionLeida: string
  autoMatcheado: boolean
  score: number
  confianza: "alta" | "media" | "baja"
  motivo: string
  fuente: "alias" | "smartmatch" | "manual"
  producto_sugerido_id?: string
  producto_sugerido_nombre?: string
  tipo_linea?: "producto" | "ajuste"
  es_ajuste_negativo?: boolean
}

function numero(valor: unknown) {
  const n = Number(valor ?? 0)
  return Number.isFinite(n) ? n : 0
}

function redondear(valor: number) {
  return Number(valor.toFixed(2))
}

function normalizarTexto(valor: string) {
  return valor.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()
}

function normalizarConcepto(valor: string) {
  return normalizarTexto(valor)
    .replace(/\bpwd\b/g, "powerade")
    .replace(/\bpow\b/g, "powerade")
    .replace(/\bpower\b/g, "powerade")
    .replace(/\b1\s*[.,]?\s*5\s*l\b/g, "1500")
    .replace(/\b1\s*[.,]\s*500\b/g, "1500")
    .replace(/\b1500\s*ml\b/g, "1500")
    .replace(/\b500\s*ml\b/g, "500")
    .replace(/\b(\d+)\s*x\s*(\d+)\b/g, "$1 $2")
    .replace(/\b(caj|caja|cajas|unidad|unid|u|pdv)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function objetivosDescuento(linea: LineaExtraida) {
  if (linea.aplica_a_descripciones?.length) return linea.aplica_a_descripciones.map(normalizarConcepto).filter(Boolean)
  const texto = normalizarTexto(linea.descripcion)
  if (/power|pwd|pow/.test(texto) && /500/.test(texto)) return ["powerade 500"]
  if (/power|pwd|pow/.test(texto) && /(1500|1 500|1 5 l)/.test(texto)) return ["powerade 1500"]
  if (/lata/.test(texto) && /354/.test(texto)) return ["lata 354"]
  return []
}

function coincideObjetivo(descripcionProducto: string, objetivo: string) {
  const producto = normalizarConcepto(descripcionProducto)
  const target = normalizarConcepto(objetivo)
  if (!producto || !target) return false
  if (producto.includes(target) || target.includes(producto)) return true
  const tokensTarget = target.split(" ").filter((t) => t.length >= 2)
  const tokensProducto = new Set(producto.split(" ").filter((t) => t.length >= 2))
  return tokensTarget.length > 0 && tokensTarget.every((t) => tokensProducto.has(t))
}

function financieros(linea: LineaExtraida, negativo: boolean, descuentoForzado?: number) {
  const cantidad = Math.max(1, numero(linea.cantidad ?? 1))
  const brutoUnitarioOriginal = numero(linea.precio_bruto_unitario ?? linea.precio_unitario)
  const brutoUnitario = negativo ? -Math.abs(brutoUnitarioOriginal) : Math.abs(brutoUnitarioOriginal)
  const subtotalOriginal = numero(linea.subtotal_neto)
  const subtotal = negativo
    ? (subtotalOriginal !== 0 ? -Math.abs(subtotalOriginal) : redondear(cantidad * brutoUnitario))
    : descuentoForzado != null
      ? redondear(Math.max(0, cantidad * Math.abs(brutoUnitario) - descuentoForzado))
      : (subtotalOriginal !== 0 ? Math.abs(subtotalOriginal) : redondear(cantidad * Math.abs(brutoUnitario)))
  const iva = numero(linea.iva ?? 21)
  const ivaImporte = linea.iva_importe != null && numero(linea.iva_importe) !== 0
    ? (negativo ? -Math.abs(numero(linea.iva_importe)) : Math.abs(numero(linea.iva_importe)))
    : redondear(subtotal * (iva / 100))
  const impuestos = linea.impuestos_internos != null ? (negativo ? -Math.abs(numero(linea.impuestos_internos)) : Math.abs(numero(linea.impuestos_internos))) : 0
  return {
    precio_bruto_unitario: redondear(brutoUnitario),
    precio_neto: cantidad > 0 ? redondear(subtotal / cantidad) : redondear(brutoUnitario),
    subtotal_neto: redondear(subtotal),
    iva_importe: redondear(ivaImporte),
    impuestos_internos: redondear(impuestos),
    bonificacion: undefined,
    cantidad_bonificada: undefined,
    cantidad_bonificada_detalle: undefined,
    tipo_bonificacion: undefined as TipoBonificacionProcesada | undefined,
  }
}

function crearLineaDescuento(linea: LineaExtraida): LineaProcesada {
  const financierosLinea = financieros(linea, true)
  const importe = Math.abs(financierosLinea.subtotal_neto ?? 0)
  const cantidad = 1
  const precio = -importe
  return {
    producto_id: "",
    cantidad,
    precio_unitario: redondear(precio),
    iva: numero(linea.iva ?? 21),
    descuento: 0,
    precio_final: redondear(financierosLinea.precio_neto ?? precio),
    ...financierosLinea,
    descripcionLeida: linea.descripcion,
    autoMatcheado: false,
    score: 100,
    confianza: "alta",
    motivo: "Descuento del comprobante conservado como línea independiente. No se aplica al precio del producto.",
    fuente: "manual",
    tipo_linea: "ajuste",
    es_ajuste_negativo: true,
    codigo_proveedor: linea.codigo_proveedor ?? undefined,
  }
}

export async function procesarLineasFacturaIA(
  supabase: SupabaseClient,
  proveedorId: string | null,
  lineasIA: LineaExtraida[],
  productos: ProductoSistema[]
): Promise<LineaProcesada[]> {
  const descuentos = lineasIA.filter((l) => l.tipo_linea === "descuento_linea" || l.tipo_linea === "descuento_agrupado")
  const productosIA = lineasIA.filter((l) => l.tipo_linea !== "descuento_linea" && l.tipo_linea !== "descuento_agrupado")
  const resultado: LineaProcesada[] = []

  for (const linea of productosIA) {
    const negativo = linea.tipo_linea === "ajuste" || linea.es_ajuste_negativo === true
    const financierosLinea = financieros(linea, negativo)
    const precioUnitario = financierosLinea.precio_bruto_unitario ?? (negativo ? -Math.abs(numero(linea.precio_unitario)) : Math.abs(numero(linea.precio_unitario)))
    const base = {
      cantidad: Math.max(0, numero(linea.cantidad)),
      precio_unitario: precioUnitario,
      iva: numero(linea.iva ?? 21),
      descuento: negativo ? 0 : Math.abs(numero(linea.descuento)),
      precio_final: financierosLinea.precio_neto ?? precioUnitario,
      ...financierosLinea,
      descripcionLeida: linea.descripcion,
      codigo_proveedor: linea.codigo_proveedor ?? undefined,
      tipo_linea: negativo ? "ajuste" as const : "producto" as const,
      es_ajuste_negativo: negativo,
    }

    if (negativo) {
      resultado.push({ ...base, producto_id: "", autoMatcheado: false, score: 100, confianza: "alta", motivo: "Línea identificada como ajuste negativo; no requiere producto.", fuente: "manual" })
      continue
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

  // Los descuentos agrupados se conservan como líneas independientes.
  // Solamente se agrega una nota informativa a los productos afectados;
  // nunca se modifica su precio, descuento o subtotal por este concepto.
  for (const descuento of descuentos) {
    const objetivos = objetivosDescuento(descuento)
    for (const linea of resultado) {
      if (linea.tipo_linea !== "producto" || !objetivos.some((objetivo) => coincideObjetivo(linea.descripcionLeida, objetivo))) continue
      linea.motivo = `${linea.motivo} Nota: este producto participa en el descuento "${descuento.descripcion}". El descuento se conserva como línea independiente y no modifica el precio del producto.`
    }
    resultado.push(crearLineaDescuento(descuento))
  }

  return resultado
}
