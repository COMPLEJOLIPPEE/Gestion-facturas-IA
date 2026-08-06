import { Plus } from "lucide-react";

import PageContainer from "@/components/layout/PageContainer";
import PageHeader from "@/components/layout/PageHeader";

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
    <PageContainer>
      <div className="flex items-center gap-3">
        <Plus className="h-6 w-6" />
        <PageHeader
          title="Nuevo proveedor"
          description="Complete los datos para registrar un nuevo proveedor."
        />
      </div>

      <Form
        categorias={categorias ?? []}
        action={crearProveedor}
      />
    </PageContainer>
  );
}