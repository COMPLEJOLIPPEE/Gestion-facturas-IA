import { Truck, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import PageContainer from "@/components/layout/PageContainer";
import PageHeader from "@/components/layout/PageHeader";

import { Badge, Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export default async function ProveedorDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: proveedor, error } = await supabase
    .from("proveedores")
    .select(`
      id,
      nombre_fantasia,
      razon_social,
      cuit,
      telefono,
      email,
      etiqueta_1,
      etiqueta_2,
      condicion_pago,
      condicion_iva,
      iibb_bsas,
      iibb_caba,
      otros_cargos,
      activo,
      categorias_proveedor (
        nombre
      )
    `)
    .eq("id", id)
    .single();

  if (error || !proveedor) {
    console.error(error);
    notFound();
  }

  const categoria = Array.isArray(proveedor.categorias_proveedor)
    ? proveedor.categorias_proveedor[0]?.nombre
    : proveedor.categorias_proveedor?.nombre;

  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Truck className="h-6 w-6" />
          <PageHeader
            title={proveedor.nombre_fantasia}
            description="Detalle del proveedor"
          />
        </div>

        <div>
          <Button asChild>
            <Link href={`/proveedores/${id}/editar`}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 rounded-xl bg-white p-6 shadow md:grid-cols-2">

        <Campo
          titulo="Razón social"
          valor={proveedor.razon_social}
        />

        <Campo
          titulo="CUIT"
          valor={proveedor.cuit}
        />

        <Campo
          titulo="Teléfono"
          valor={proveedor.telefono}
        />

        <Campo
          titulo="Email"
          valor={proveedor.email}
        />

        <Campo
          titulo="Categoría"
          valor={categoria ?? "Sin categoría"}
        />

        <Campo
          titulo="Condición IVA"
          valor={proveedor.condicion_iva}
        />

        <Campo
          titulo="Condición de pago"
          valor={proveedor.condicion_pago}
        />

        <Campo
          titulo="IIBB Buenos Aires"
          valor={
            proveedor.iibb_bsas
              ? `${proveedor.iibb_bsas}%`
              : "No aplica"
          }
        />

        <Campo
          titulo="IIBB CABA"
          valor={
            proveedor.iibb_caba
              ? `${proveedor.iibb_caba}%`
              : "No aplica"
          }
        />

        <Campo
          titulo="Otros cargos"
          valor={proveedor.otros_cargos}
        />

        <Campo
          titulo="Etiqueta 1"
          valor={proveedor.etiqueta_1}
        />

        <Campo
          titulo="Etiqueta 2"
          valor={proveedor.etiqueta_2}
        />

        <div>
          <p className="text-sm text-gray-500">
            Estado
          </p>

          <div className="mt-1">
            <Badge
              variant={
                proveedor.activo
                  ? "success"
                  : "danger"
              }
            >
              {proveedor.activo
                ? "Activo"
                : "Inactivo"}
            </Badge>
          </div>
        </div>

      </div>
    </PageContainer>
  );
}

function Campo({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string | null;
}) {
  return (
    <div>
      <p className="text-sm text-gray-500">
        {titulo}
      </p>

      <p className="font-medium">
        {valor || "—"}
      </p>
    </div>
  );
}