import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

import { Button, Input } from "@/components/ui";
import { actualizarProveedor } from "../actions";

export default async function EditarProveedorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: proveedor, error } = await supabase
    .from("proveedores")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !proveedor) {
    console.error("Error buscando proveedor:", error);
    notFound();
  }

  const { data: categorias } = await supabase
    .from("categorias_proveedor")
    .select("id, nombre")
    .order("nombre");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Pencil className="h-8 w-8" />
          Editar proveedor
        </h1>

        <p className="mt-1 text-gray-600">
          Modifique la información del proveedor.
        </p>
      </div>

      <form
        action={actualizarProveedor.bind(null, id)}
        className="grid max-w-xl gap-4 rounded-xl bg-white p-6 shadow"
      >
        <Input
          name="nombre_fantasia"
          defaultValue={proveedor.nombre_fantasia ?? ""}
          placeholder="Nombre fantasía"
          required
        />

        <Input
          name="razon_social"
          defaultValue={proveedor.razon_social ?? ""}
          placeholder="Razón social"
          required
        />

        <Input
          name="cuit"
          defaultValue={proveedor.cuit ?? ""}
          placeholder="CUIT"
        />

        <Input
          name="telefono"
          defaultValue={proveedor.telefono ?? ""}
          placeholder="Teléfono"
        />

        <Input
          type="email"
          name="email"
          defaultValue={proveedor.email ?? ""}
          placeholder="Email"
        />

        <select
          name="categoria_id"
          defaultValue={proveedor.categoria_id ?? ""}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Seleccionar categoría</option>

          {categorias?.map((categoria) => (
            <option
              key={categoria.id}
              value={categoria.id}
            >
              {categoria.nombre}
            </option>
          ))}
        </select>

        <Input
          name="etiqueta_1"
          defaultValue={proveedor.etiqueta_1 ?? ""}
          placeholder="Etiqueta 1"
        />

        <Input
          name="etiqueta_2"
          defaultValue={proveedor.etiqueta_2 ?? ""}
          placeholder="Etiqueta 2"
        />

        <Input
          name="condicion_pago"
          defaultValue={proveedor.condicion_pago ?? ""}
          placeholder="Condición de pago"
        />

        <Button type="submit">
          Guardar cambios
        </Button>
      </form>
    </div>
  );
}