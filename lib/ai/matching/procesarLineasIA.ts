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

  descripcionLeida: string;

  codigo_proveedor?: string;

  autoMatcheado: boolean;

  score: number;

  confianza: "alta" | "media" | "baja";

  motivo: string;

  fuente: "alias" | "smartmatch" | "manual";
};

export async function procesarLineasIA(
  supabase: SupabaseClient,
  proveedorId: string,
  lineasIA: LineaIA[],
  productos: ProductoSistema[]
): Promise<LineaProcesada[]> {

  const resultado: LineaProcesada[] = [];

  for (const linea of lineasIA) {

    const iva = linea.iva ?? 21;

    const descuento = linea.descuento ?? 0;

    const subtotal =
      linea.cantidad * linea.precio_unitario;

    const precioFinal =
      linea.precio_final ??
      (subtotal - descuento);

    // ------------------------------------------------
    // 1) Buscar alias del proveedor
    // ------------------------------------------------

    const alias = await buscarAlias(
      supabase,
      proveedorId,
      linea.descripcion,
      linea.codigo_proveedor
    );

    if (alias) {

      resultado.push({

        producto_id:
          alias.producto_id,

        cantidad:
          linea.cantidad,

        precio_unitario:
          linea.precio_unitario,

        iva,

        descuento,

        precio_final:
          precioFinal,

        descripcionLeida:
          linea.descripcion,

        codigo_proveedor:
          linea.codigo_proveedor ?? undefined,

        autoMatcheado: true,

        score: 100,

        confianza: "alta",

        motivo:
          "Producto reconocido mediante historial del proveedor.",

        fuente: "alias",

      });

      continue;
    }

    // ------------------------------------------------
    // 2) SmartMatch
    // ------------------------------------------------

    const match = smartMatch(
      linea.descripcion,
      productos
    );

    resultado.push({

      producto_id:
        match.producto?.id ?? "",

      cantidad:
        linea.cantidad,

      precio_unitario:
        linea.precio_unitario,

      iva,

      descuento,

      precio_final:
        precioFinal,

      descripcionLeida:
        linea.descripcion,

      codigo_proveedor:
        linea.codigo_proveedor ?? undefined,

      autoMatcheado:
        match.confianza === "alta",

      score:
        match.score,

      confianza:
        match.confianza,

      motivo:
        match.motivo,

      fuente:
        "smartmatch",

    });
  }

  return resultado;
}