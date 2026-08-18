import { SupabaseClient } from "@supabase/supabase-js";

import type { ComprobanteExtraido } from "../tipos";
import type { LineaProcesada } from "../matching/procesarLineasIA";
import { procesarLineasIA } from "../matching/procesarLineasIA";

type ProductoSistema = {
  id: string;
  nombre: string;
};

type ComprobanteProcesado = Omit<ComprobanteExtraido, "lineas"> & {
  lineas: LineaProcesada[];
};

export async function procesarComprobanteIA(
  supabase: SupabaseClient,
  comprobante: ComprobanteExtraido,
  proveedorId: string,
  productos: ProductoSistema[]
): Promise<ComprobanteProcesado> {

  const lineas = await procesarLineasIA(
    supabase,
    proveedorId,
    comprobante.lineas,
    productos
  );

  return {
    ...comprobante,
    lineas,
  };

}