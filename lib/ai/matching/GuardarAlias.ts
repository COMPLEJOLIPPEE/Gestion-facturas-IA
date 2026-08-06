import { SupabaseClient } from "@supabase/supabase-js";
import { normalizarTexto } from "./NormalizarTexto";

export async function guardarAlias(
  supabase: SupabaseClient,
  proveedorId: string,
  productoId: string,
  descripcionOriginal: string,
  codigoProveedor?: string
) {
  await supabase.rpc("guardar_alias", {
    p_proveedor_id: proveedorId,
    p_producto_id: productoId,
    p_codigo_proveedor: codigoProveedor ?? null,
    p_descripcion_original: descripcionOriginal,
    p_descripcion_normalizada: normalizarTexto(descripcionOriginal),
    p_confianza: 100,
  });
}