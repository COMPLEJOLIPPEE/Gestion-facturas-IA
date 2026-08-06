import { Badge } from "@/components/ui";
import PageContainer from "@/components/layout/PageContainer";
import PageHeader from "@/components/layout/PageHeader";

import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProductoDetalle({
  params,
}: Props) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: producto, error } = await supabase
    .from("productos")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !producto) {
    return (
      <PageContainer>
        <div className="rounded-xl bg-red-50 p-4 text-red-700">
          Producto no encontrado.
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={producto.nombre}
        description={`Código: ${producto.codigo ?? "—"}`}
      />

      <div className="grid grid-cols-1 gap-4 rounded-xl bg-white p-6 shadow md:grid-cols-2">

        <div>
          <span className="text-gray-500">
            Unidad de medida
          </span>

          <p className="mt-1 font-medium">
            {producto.unidad_medida || "—"}
          </p>
        </div>

        <div>
          <span className="text-gray-500">
            Costo actual
          </span>

          <p className="mt-1 font-medium">
            $
            {Number(producto.costo_actual ?? 0).toLocaleString(
              "es-AR",
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            )}
          </p>
        </div>

        <div>
          <span className="text-gray-500">
            Precio de venta
          </span>

          <p className="mt-1 font-medium">
            $
            {Number(producto.precio_venta ?? 0).toLocaleString(
              "es-AR",
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            )}
          </p>
        </div>

        <div>
          <span className="text-gray-500">
            Estado
          </span>

          <div className="mt-1">
            <Badge
              variant={
                producto.activo
                  ? "success"
                  : "danger"
              }
            >
              {producto.activo
                ? "Activo"
                : "Inactivo"}
            </Badge>
          </div>
        </div>

      </div>
    </PageContainer>
  );
}