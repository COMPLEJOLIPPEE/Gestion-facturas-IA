import { SupabaseClient } from "@supabase/supabase-js";
import type { LineaExtraida } from "../tipos";
import { buscarAlias } from "./buscarAlias";
import { smartMatch } from "./smartMatch";

export type LineaIA = LineaExtraida;

export type TipoBonificacionProcesada =
  | "cantidad"
  | "importe"
  | "porcentaje";

export type ProductoSistema = {
  id: string;
  nombre: string;
};

export type LineaProcesada = {
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  iva: number;
  descuento: number;
  precio_final: number;
  bonificacion?: number;
  cantidad_bonificada?: number;
  cantidad_bonificada_detalle?: number;
  tipo_bonificacion?: TipoBonificacionProcesada;
  precio_bruto_unitario?: number;
  precio_neto?: number;
  subtotal_neto?: number;
  iva_importe?: number;
  impuestos_internos?: number;
  codigo_proveedor?: string;
  descripcionLeida: string;
  autoMatcheado: boolean;
  score: number;
  confianza: "alta" | "media" | "baja";
  motivo: string;
  fuente: "alias" | "smartmatch" | "manual";
  producto_sugerido_id?: string;
  producto_sugerido_nombre?: string;
};

function normalizarTipoBonificacion(
  valor: string | null | undefined
): TipoBonificacionProcesada | undefined {
  if (
    valor === "cantidad" ||
    valor === "importe" ||
    valor === "porcentaje"
  ) {
    return valor;
  }

  return undefined;
}

function datosFinancieros(linea: LineaIA) {
  return {
    bonificacion:
      linea.bonificacion != null
        ? Math.abs(linea.bonificacion)
        : undefined,
    cantidad_bonificada:
      linea.cantidad_bonificada != null
        ? Math.max(0, linea.cantidad_bonificada)
        : undefined,
    cantidad_bonificada_detalle:
      linea.cantidad_bonificada_detalle != null
        ? Math.max(0, linea.cantidad_bonificada_detalle)
        : undefined,
    tipo_bonificacion: normalizarTipoBonificacion(
      linea.tipo_bonificacion
    ),
    precio_bruto_unitario:
      linea.precio_bruto_unitario != null
        ? Math.abs(linea.precio_bruto_unitario)
        : undefined,
    precio_neto:
      linea.precio_neto != null
        ? Math.abs(linea.precio_neto)
        : undefined,
    subtotal_neto:
      linea.subtotal_neto != null
        ? Math.abs(linea.subtotal_neto)
        : undefined,
    iva_importe:
      linea.iva_importe != null
        ? Math.abs(linea.iva_importe)
        : undefined,
    impuestos_internos:
      linea.impuestos_internos != null
        ? Math.abs(linea.impuestos_internos)
        : undefined,
  };
}

export async function procesarLineasIA(
  supabase: SupabaseClient,
  proveedorId: string | null,
  lineasIA: LineaIA[],
  productos: ProductoSistema[]
): Promise<LineaProcesada[]> {
  const resultado: LineaProcesada[] = [];

  for (const linea of lineasIA) {
    const iva = linea.iva ?? 21;
    const descuento = Math.abs(linea.descuento ?? 0);
    const subtotal = linea.cantidad * Math.abs(linea.precio_unitario);
    const precioFinal =
      linea.precio_final != null
        ? Math.abs(linea.precio_final)
        : linea.subtotal_neto != null
          ? Math.abs(linea.subtotal_neto)
          : Math.max(0, subtotal - descuento);

    const financieros = datosFinancieros(linea);

    const alias = proveedorId
      ? await buscarAlias(
          supabase,
          proveedorId,
          linea.descripcion,
          linea.codigo_proveedor
        )
      : null;

    const base: Omit<LineaProcesada, "producto_id" | "autoMatcheado" | "score" | "confianza" | "motivo" | "fuente" | "producto_sugerido_id" | "producto_sugerido_nombre"> = {
      cantidad: linea.cantidad,
      precio_unitario: Math.abs(linea.precio_unitario),
      iva,
      descuento,
      precio_final: precioFinal,
      ...financieros,
      descripcionLeida: linea.descripcion,
      codigo_proveedor: linea.codigo_proveedor ?? undefined,
    };

    if (alias) {
      resultado.push({
        ...base,
        producto_id: alias.producto_id,
        autoMatcheado: true,
        score: 100,
        confianza: "alta",
        motivo: "Producto reconocido mediante historial del proveedor.",
        fuente: "alias",
      });
      continue;
    }

    const match = smartMatch(linea.descripcion, productos);

    if (match.confianza === "alta" && match.producto) {
      resultado.push({
        ...base,
        producto_id: match.producto.id,
        autoMatcheado: true,
        score: match.score,
        confianza: "alta",
        motivo: match.motivo,
        fuente: "smartmatch",
      });
      continue;
    }

    if (match.confianza === "media" && match.producto) {
      resultado.push({
        ...base,
        producto_id: "",
        autoMatcheado: false,
        score: match.score,
        confianza: "media",
        motivo: match.motivo,
        fuente: "smartmatch",
        producto_sugerido_id: match.producto.id,
        producto_sugerido_nombre: match.producto.nombre,
      });
      continue;
    }

    resultado.push({
      ...base,
      producto_id: "",
      autoMatcheado: false,
      score: match.score,
      confianza: "baja",
      motivo: match.motivo,
      fuente: "smartmatch",
    });
  }

  return resultado;
}
