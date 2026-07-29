import { Truck, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

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
      activo,
      categorias_proveedor (
        nombre
      )
    `)
    .eq("id", id)
    .single();

  if (error || !proveedor) {
    console.error("Error buscando proveedor:", error);
    notFound();
  }

  const categoria = Array.isArray(proveedor.categorias_proveedor)
    ? proveedor.categorias_proveedor[0]?.nombre
    : proveedor.categorias_proveedor?.nombre;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Truck className="h-8 w-8" />
            {proveedor.nombre_fantasia}
          </h1>

          <p className="mt-1 text-gray-600">
            Detalle del proveedor
          </p>
        </div>

        <Button asChild>
          <Link href={`/proveedores/${id}/editar`}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 rounded-xl bg-white p-6 shadow md:grid-cols-2">
        <Campo titulo="Razón social" valor={proveedor.razon_social} />
        <Campo titulo="CUIT" valor={proveedor.cuit} />
        <Campo titulo="Teléfono" valor={proveedor.telefono} />
        <Campo titulo="Email" valor={proveedor.email} />
        <Campo titulo="Categoría" valor={categoria ?? "Sin categoría"} />
        <Campo
          titulo="Condición de pago"
          valor={proveedor.condicion_pago}
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

          <Badge
            variant={proveedor.activo ? "success" : "danger"}
          >
            {proveedor.activo ? "Activo" : "Inactivo"}
          </Badge>
        </div>
      </div>
    </div>
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