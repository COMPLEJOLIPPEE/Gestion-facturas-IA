import { PackagePlus } from "lucide-react";

import { Alert } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

import { crearProducto } from "./actions";
import Form from "./form";

type Props = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function NuevoProductoPage({
  searchParams,
}: Props) {
  const params = await searchParams;

  const supabase = await createClient();

  const { data: categorias } = await supabase
    .from("categorias_productos")
    .select("id, nombre")
    .order("nombre");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <PackagePlus className="h-8 w-8" />
          Nuevo producto
        </h1>

        <p className="mt-1 text-gray-600">
          Complete los datos para crear un nuevo producto.
        </p>
      </div>

      {params.error && (
        <Alert variant="error">
          {params.error}
        </Alert>
      )}

      <Form
        categorias={categorias ?? []}
        action={crearProducto}
      />
    </div>
  );
}