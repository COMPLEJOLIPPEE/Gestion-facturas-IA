import { SupabaseClient } from "@supabase/supabase-js";
import type { LineaExtraida } from "../tipos";
import { buscarAlias } from "./buscarAlias";
import { smartMatch } from "./smartMatch";

export type LineaIA = LineaExtraida;

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
  tipo_bonificacion?: "cantidad" | "importe" | "porcentaje";
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

function datosFinancieros(linea: LineaIA) {
  const precioBrutoUnitario =
    linea.precio_bruto_unitario != null
      ? Math.abs(Number(linea.precio_bruto_unitario))
      : Math.abs(Number(linea.precio_unitario ?? 0));

  const cantidad = Math.max(0, Number(linea.cantidad ?? 0));
  const descuento = Math.abs(Number(linea.descuento ?? 0));
  const bonificacion =
    linea.bonificacion != null
      ? Math.abs(Number(linea.bonificacion))
      : 0;

  const cantidadBonificada = Math.max(
    0,
    Number(linea.cantidad_bonificada ?? linea.cantidad_bonificada_detalle ?? 0)
  );

  const bonificacionCantidad =
    linea.tipo_bonificacion === "cantidad"
      ? cantidadBonificada * precioBrutoUnitario
      : 0;

  const subtotalCalculado = Math.max(
    0,
    cantidad * precioBrutoUnitario - descuento - bonificacion - bonificacionCantidad
  );

  const subtotalNeto =
    linea.subtotal_neto != null
      ? Math.abs(Number(linea.subtotal_neto))
      : subtotalCalculado;

  const precioNeto =
    linea.precio_neto != null
      ? Math.abs(Number(linea.precio_neto))
      : cantidad > 0
        ? subtotalNeto / cantidad
        : 0;

  const iva = Number(linea.iva ?? 21);
  const ivaImporte =
    linea.iva_importe != null
      ? Math.abs(Number(linea.iva_importe))
      : subtotalNeto * (iva / 100);

  return {
    bonificacion: bonificacion || undefined,
    cantidad_bonificada: cantidadBonificada || undefined,
    cantidad_bonificada_detalle:
      linea.cantidad_bonificada_detalle != null
        ? Math.max(0, Number(linea.cantidad_bonificada_detalle))
        : undefined,
    tipo_bonificacion:
      linea.tipo_bonificacion === "cantidad" ||
      linea.tipo_bonificacion === "importe" ||
      linea.tipo_bonificacion === "porcentaje"
        ? linea.tipo_bonificacion
        : undefined,
    precio_bruto_unitario: precioBrutoUnitario,
    precio_neto: precioNeto,
    subtotal_neto: subtotalNeto,
    iva_importe: Math.abs(ivaImporte),
    impuestos_internos:
      linea.impuestos_internos != null
        ? Math.abs(Number(linea.impuestos_internos))
        : 0,
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
    // Las líneas de descuento son conceptos financieros, no productos.
    if (
      linea.tipo_linea === "descuento_linea" ||
      linea.tipo_linea === "descuento_agrupado"
    ) {
      continue;
    }

    const iva = linea.iva != null ? Number(linea.iva) : 21;
    const precioUnitario =
      linea.precio_bruto_unitario != null
        ? Math.abs(Number(linea.precio_bruto_unitario))
        : Math.abs(Number(linea.precio_unitario ?? 0));
    const descuento = Math.abs(Number(linea.descuento ?? 0));
    const financieros = datosFinancieros(linea);

    const precioFinal =
      linea.precio_final != null
        ? Math.abs(Number(linea.precio_final))
        : financieros.precio_neto ?? 0;

    const alias = proveedorId
      ? await buscarAlias(
          supabase,
          proveedorId,
          linea.descripcion,
          linea.codigo_proveedor
        )
      : null;

    const base = {
      cantidad: Math.max(0, Number(linea.cantidad ?? 0)),
      precio_unitario: precioUnitario,
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
