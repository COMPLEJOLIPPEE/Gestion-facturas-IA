import { Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

import Form from "./form";
import { crearProveedor } from "./actions";

export default async function NuevoProveedorPage() {
  const supabase = await createClient();

  const { data: categorias, error } = await supabase
    .from("categorias_proveedor")
    .select("id, nombre")
    .order("nombre");

  if (error) {
    console.error("Error cargando categorías:", error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Plus className="h-8 w-8" />
          Nuevo proveedor
        </h1>

        <p className="mt-1 text-gray-600">
          Complete los datos para registrar un nuevo proveedor.
        </p>
      </div>

      <Form
        categorias={categorias ?? []}
        action={crearProveedor}
      />
    </div>
  );
}