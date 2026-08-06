import { PackagePlus } from "lucide-react";

import { Alert } from "@/components/ui";
import PageContainer from "@/components/layout/PageContainer";
import PageHeader from "@/components/layout/PageHeader";

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
    <PageContainer>
      <div className="flex items-center gap-3">
        <PackagePlus className="h-6 w-6" />
        <PageHeader
          title="Nuevo producto"
          description="Complete los datos para crear un nuevo producto."
        />
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
    </PageContainer>
  );
}