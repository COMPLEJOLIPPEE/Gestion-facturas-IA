import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

import PageContainer from "@/components/layout/PageContainer";
import PageHeader from "@/components/layout/PageHeader";

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
    console.error(error);
    notFound();
  }

  const { data: categorias } = await supabase
    .from("categorias_proveedor")
    .select("id, nombre")
    .order("nombre");

  return (
    <PageContainer>
      <PageHeader
        title="Editar proveedor"
        description="Modifique la información del proveedor."
        icon={<Pencil className="h-6 w-6" />}
      />

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

        <select
          name="condicion_iva"
          defaultValue={proveedor.condicion_iva ?? ""}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Condición IVA</option>
          <option>Responsable Inscripto</option>
          <option>Monotributista</option>
          <option>Exento</option>
          <option>Consumidor Final</option>
        </select>

        <select
          name="condicion_pago"
          defaultValue={proveedor.condicion_pago ?? ""}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Condición de pago</option>
          <option>Contado</option>
          <option>7 días</option>
          <option>15 días</option>
          <option>30 días</option>
          <option>Transferencia</option>
        </select>

        <div className="grid grid-cols-2 gap-4">
          <Input
            type="number"
            step="0.01"
            min="0"
            name="iibb_bsas"
            defaultValue={proveedor.iibb_bsas ?? 0}
            placeholder="IIBB Buenos Aires (%)"
          />

          <Input
            type="number"
            step="0.01"
            min="0"
            name="iibb_caba"
            defaultValue={proveedor.iibb_caba ?? 0}
            placeholder="IIBB CABA (%)"
          />
        </div>

        <Input
          name="otros_cargos"
          defaultValue={proveedor.otros_cargos ?? ""}
          placeholder="Otros cargos habituales"
        />

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

        <Button type="submit">
          Guardar cambios
        </Button>
      </form>
    </PageContainer>
  );
}