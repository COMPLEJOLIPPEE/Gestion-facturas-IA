import { SupabaseClient } from "@supabase/supabase-js";
import { normalizarTexto } from "./normalizarTexto";

type ResultadoAlias = {
  producto_id: string;
  confianza: number;
} | null;

export async function buscarAlias(
  supabase: SupabaseClient,
  proveedorId: string,
  descripcion: string,
  codigoProveedor?: string | null
): Promise<ResultadoAlias> {

  // 1) Buscar primero por código del proveedor
  if (codigoProveedor) {

    const { data } = await supabase
      .from("producto_aliases")
      .select("producto_id, confianza")
      .eq("proveedor_id", proveedorId)
      .eq("codigo_proveedor", codigoProveedor)
      .maybeSingle();

    if (data) {

      await supabase
        .from("producto_aliases")
        .update({
          veces_usado: 1,
          ultima_fecha: new Date().toISOString(),
        })
        .eq("proveedor_id", proveedorId)
        .eq("codigo_proveedor", codigoProveedor);

      return data;

    }

  }

  // 2) Buscar por descripción normalizada

  const descripcionNormalizada =
    normalizarTexto(descripcion);

  const { data } = await supabase
    .from("producto_aliases")
    .select("producto_id, confianza")
    .eq("proveedor_id", proveedorId)
    .eq(
      "descripcion_normalizada",
      descripcionNormalizada
    )
    .maybeSingle();

  if (!data) {

    return null;

  }

  await supabase
    .from("producto_aliases")
    .update({
      veces_usado: 1,
      ultima_fecha: new Date().toISOString(),
    })
    .eq("producto_id", data.producto_id)
    .eq(
      "descripcion_normalizada",
      descripcionNormalizada
    );

  return data;

}