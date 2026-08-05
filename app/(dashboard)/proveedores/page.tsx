import Link from "next/link";
import { Truck, Plus } from "lucide-react";

import { Alert, Badge, Button } from "@/components/ui";
import { DataTable, Column } from "@/components/DataTable";
import { createClient } from "@/lib/supabase/server";

type Proveedor = {
  id: string;
  nombre_fantasia: string;
  razon_social: string;
  cuit: string;
  activo: boolean;
  etiqueta_1: string | null;
  etiqueta_2: string | null;
  categorias_proveedor: {
    nombre: string;
  } | null;
};

const columns: Column<Proveedor>[] = [
  {
    key: "nombre_fantasia",
    label: "Nombre fantasía",
  },
  {
    key: "razon_social",
    label: "Razón social",
  },
  {
    key: "categoria",
    label: "Categoría",
    render: (p) =>
      p.categorias_proveedor?.nombre ?? (
        <span className="italic text-gray-400">
          Sin categoría
        </span>
      ),
  },
  {
    key: "etiquetas",
    label: "Etiquetas",
    render: (p) => (
      <>
        {p.etiqueta_1}
        {p.etiqueta_1 && p.etiqueta_2 && <br />}
        {p.etiqueta_2}
      </>
    ),
  },
  {
    key: "activo",
    label: "Estado",
    align: "center",
    render: (p) => (
      <Badge variant={p.activo ? "success" : "danger"}>
        {p.activo ? "Activo" : "Inactivo"}
      </Badge>
    ),
  },
];

export default async function ProveedoresPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("proveedores")
    .select(`
      id,
      nombre_fantasia,
      razon_social,
      cuit,
      activo,
      etiqueta_1,
      etiqueta_2,
      categorias_proveedor (nombre)
    `)
    .order("nombre_fantasia");

  if (error) {
    return (
      <Alert variant="error">
        Error cargando proveedores: {error.message}
      </Alert>
    );
  }

  const proveedores: Proveedor[] = (data ?? []).map((p) => ({
    id: p.id,
    nombre_fantasia: p.nombre_fantasia,
    razon_social: p.razon_social ?? "",
    cuit: p.cuit ?? "",
    activo: Boolean(p.activo),
    etiqueta_1: p.etiqueta_1 ?? null,
    etiqueta_2: p.etiqueta_2 ?? null,
    categorias_proveedor: Array.isArray(p.categorias_proveedor)
      ? p.categorias_proveedor[0] ?? null
      : p.categorias_proveedor ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Truck className="h-8 w-8" />
            Proveedores
          </h1>

          <p className="mt-1 text-gray-600">
            Gestión de proveedores.
          </p>
        </div>

        <Button
          asChild
          icon={<Plus className="h-4 w-4" />}
          >
          <Link href="/proveedores/nuevo">
            Nuevo proveedor
          </Link>
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={proveedores}
        onView={(p) => `/proveedores/${p.id}`}
        onEdit={(p) => `/proveedores/${p.id}/editar`}
      />
    </div>
  );
}