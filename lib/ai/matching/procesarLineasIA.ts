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

  // -----------------------------------------
  // Sugerencia de SmartMatch
  // -----------------------------------------

  producto_sugerido_id?: string;

  producto_sugerido_nombre?: string;
};

export async function procesarLineasIA(
  supabase: SupabaseClient,
  proveedorId: string | null,
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

    // -----------------------------------------
    // 1. Buscar alias del proveedor
    // -----------------------------------------

   const alias = proveedorId
  ? await buscarAlias(
      supabase,
      proveedorId,
      linea.descripcion,
      linea.codigo_proveedor
    )
  : null;
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

    // -----------------------------------------
    // 2. SmartMatch
    // -----------------------------------------

    const match = smartMatch(
      linea.descripcion,
      productos
    );

    // -----------------------------------------
    // 3. ALTA CONFIANZA
    // -----------------------------------------
    // Se selecciona automáticamente.
    // -----------------------------------------

    if (
      match.confianza === "alta" &&
      match.producto
    ) {
      resultado.push({
        producto_id:
          match.producto.id,

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

        score:
          match.score,

        confianza:
          "alta",

        motivo:
          match.motivo,

        fuente:
          "smartmatch",
      });

      continue;
    }

    // -----------------------------------------
    // 4. CONFIANZA MEDIA
    // -----------------------------------------
    // NO seleccionamos automáticamente.
    // Guardamos el producto como sugerencia.
    // -----------------------------------------

    if (
      match.confianza === "media" &&
      match.producto
    ) {
      resultado.push({
        producto_id: "",

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

        autoMatcheado: false,

        score:
          match.score,

        confianza:
          "media",

        motivo:
          match.motivo,

        fuente:
          "smartmatch",

        producto_sugerido_id:
          match.producto.id,

        producto_sugerido_nombre:
          match.producto.nombre,
      });

      continue;
    }

    // -----------------------------------------
    // 5. CONFIANZA BAJA
    // -----------------------------------------
    // No asignamos ni sugerimos producto.
    // -----------------------------------------

    resultado.push({
      producto_id: "",

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

      autoMatcheado: false,

      score:
        match.score,

      confianza:
        "baja",

      motivo:
        match.motivo,

      fuente:
        "smartmatch",
    });
  }

  return resultado;
}