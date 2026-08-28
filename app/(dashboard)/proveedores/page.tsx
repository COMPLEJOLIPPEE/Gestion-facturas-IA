import Link from "next/link";
import { Plus, Truck } from "lucide-react";

import { Alert, Badge, Button } from "@/components/ui";
import { DataTable, Column } from "@/components/DataTable";
import PageContainer from "@/components/layout/PageContainer";
import PageHeader from "@/components/layout/PageHeader";

import { createClient } from "@/lib/supabase/server";
import { canWrite, getCurrentRole } from "@/lib/auth/permissions";

type Proveedor = {
  id: string;
  nombre_fantasia: string;
  razon_social: string;
  cuit: string;
  activo: boolean;
  etiqueta_1: string | null;
  etiqueta_2: string | null;
  categorias_proveedor: { nombre: string } | null;
};

const columns: Column<Proveedor>[] = [
  { key: "nombre_fantasia", label: "Nombre fantasía" },
  { key: "razon_social", label: "Razón social" },
  {
    key: "categoria",
    label: "Categoría",
    render: (p) => (
      <Badge variant="secondary">
        {p.categorias_proveedor?.nombre ?? "Sin categoría"}
      </Badge>
    ),
  },
  {
    key: "etiquetas",
    label: "Etiquetas",
    render: (p) => (
      <div className="space-y-1">
        {p.etiqueta_1 && <Badge variant="info">{p.etiqueta_1}</Badge>}
        {p.etiqueta_2 && <Badge variant="secondary">{p.etiqueta_2}</Badge>}
        {!p.etiqueta_1 && !p.etiqueta_2 && (
          <span className="text-gray-400">—</span>
        )}
      </div>
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
  const role = await getCurrentRole();
  const writable = canWrite(role);

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
    return <Alert variant="error">Error cargando proveedores: {error.message}</Alert>;
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
    <PageContainer>
      <PageHeader
        title="Proveedores"
        description="Gestión de proveedores"
        icon={<Truck className="h-6 w-6" />}
        actions={
          writable ? (
            <Link href="/proveedores/nuevo">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo proveedor
              </Button>
            </Link>
          ) : undefined
        }
      />

      {writable ? (
        <DataTable
          columns={columns}
          data={proveedores}
          onView={(p) => `/proveedores/${p.id}`}
          onEdit={(p) => `/proveedores/${p.id}/editar`}
        />
      ) : (
        <DataTable
          columns={columns}
          data={proveedores}
          onView={(p) => `/proveedores/${p.id}`}
        />
      )}
    </PageContainer>
  );
}
