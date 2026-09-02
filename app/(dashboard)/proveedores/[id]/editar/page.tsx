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
        <Input name="nombre_fantasia" defaultValue={proveedor.nombre_fantasia ?? ""} placeholder="Nombre fantasía" required />
        <Input name="razon_social" defaultValue={proveedor.razon_social ?? ""} placeholder="Razón social" required />
        <Input name="cuit" defaultValue={proveedor.cuit ?? ""} placeholder="CUIT" />
        <Input name="telefono" defaultValue={proveedor.telefono ?? ""} placeholder="Teléfono" />
        <Input type="email" name="email" defaultValue={proveedor.email ?? ""} placeholder="Email" />

        <div>
          <label htmlFor="categoria_id" className="mb-1 block text-sm font-medium text-gray-700">Categoría del proveedor</label>
          <select id="categoria_id" name="categoria_id" defaultValue={proveedor.categoria_id ?? ""} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Seleccionar categoría</option>
            {categorias?.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="condicion_iva" className="mb-1 block text-sm font-medium text-gray-700">Condición frente al IVA</label>
          <select id="condicion_iva" name="condicion_iva" defaultValue={proveedor.condicion_iva ?? ""} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Seleccionar condición IVA</option>
            <option>Responsable Inscripto</option>
            <option>Monotributista</option>
            <option>Exento</option>
            <option>Consumidor Final</option>
          </select>
        </div>

        <div>
          <label htmlFor="condicion_pago" className="mb-1 block text-sm font-medium text-gray-700">Condición de pago</label>
          <select id="condicion_pago" name="condicion_pago" defaultValue={proveedor.condicion_pago ?? ""} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Seleccionar condición de pago</option>
            <option>Contado</option>
            <option>7 días</option>
            <option>15 días</option>
            <option>30 días</option>
            <option>Transferencia</option>
          </select>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-gray-800">Ingresos Brutos (IIBB)</h3>
            <p className="mt-1 text-xs text-gray-500">Indicá el porcentaje habitual que corresponde a este proveedor según jurisdicción.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="iibb_bsas" className="mb-1 block text-sm font-medium text-gray-700">IIBB Buenos Aires (%)</label>
              <Input id="iibb_bsas" type="number" step="0.01" min="0" name="iibb_bsas" defaultValue={proveedor.iibb_bsas ?? 0} placeholder="Ej.: 3,50" />
            </div>
            <div>
              <label htmlFor="iibb_caba" className="mb-1 block text-sm font-medium text-gray-700">IIBB CABA (%)</label>
              <Input id="iibb_caba" type="number" step="0.01" min="0" name="iibb_caba" defaultValue={proveedor.iibb_caba ?? 0} placeholder="Ej.: 3,00" />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="otros_cargos" className="mb-1 block text-sm font-medium text-gray-700">Otros cargos habituales</label>
          <Input id="otros_cargos" name="otros_cargos" defaultValue={proveedor.otros_cargos ?? ""} placeholder="Ej.: flete, seguro u otro cargo" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="etiqueta_1" className="mb-1 block text-sm font-medium text-gray-700">Etiqueta 1</label>
            <Input id="etiqueta_1" name="etiqueta_1" defaultValue={proveedor.etiqueta_1 ?? ""} placeholder="Etiqueta" />
          </div>
          <div>
            <label htmlFor="etiqueta_2" className="mb-1 block text-sm font-medium text-gray-700">Etiqueta 2</label>
            <Input id="etiqueta_2" name="etiqueta_2" defaultValue={proveedor.etiqueta_2 ?? ""} placeholder="Etiqueta" />
          </div>
        </div>

        <Button type="submit">Guardar cambios</Button>
      </form>
    </PageContainer>
  );
}
