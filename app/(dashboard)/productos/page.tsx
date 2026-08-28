import Link from "next/link";
import { Plus } from "lucide-react";

import { Alert, Button } from "@/components/ui";
import PageContainer from "@/components/layout/PageContainer";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable } from "@/components/DataTable";

import { createClient } from "@/lib/supabase/server";
import { canWrite, getCurrentRole } from "@/lib/auth/permissions";

import { columns, Producto } from "./columns";
import ProductosTable from "./table";

export default async function ProductosPage() {
  const supabase = await createClient();
  const role = await getCurrentRole();
  const writable = canWrite(role);

  const { data, error } = await supabase
    .from("productos")
    .select(`
      id,
      codigo,
      nombre,
      unidad_medida,
      costo_actual,
      precio_venta,
      activo,
      categorias_productos (nombre)
    `)
    .order("nombre");

  if (error) {
    return (
      <Alert variant="error">
        Error cargando productos: {error.message}
      </Alert>
    );
  }

  const productos: Producto[] = (data ?? []).map((p) => ({
    id: p.id,
    codigo: p.codigo ?? "",
    nombre: p.nombre,
    unidad_medida: p.unidad_medida ?? "",
    costo_actual: p.costo_actual ?? 0,
    precio_venta: p.precio_venta ?? 0,
    activo: Boolean(p.activo),
    categorias_productos: Array.isArray(p.categorias_productos)
      ? p.categorias_productos[0] ?? null
      : p.categorias_productos ?? null,
  }));

  return (
    <PageContainer>
      <PageHeader
        title="Productos"
        description="Gestión de productos"
        actions={
          writable ? (
            <Link href="/productos/nuevo">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo producto
              </Button>
            </Link>
          ) : undefined
        }
      />

      {writable ? (
        <ProductosTable productos={productos} />
      ) : (
        <DataTable
          columns={columns}
          data={productos}
          onView={(p) => `/productos/${p.id}`}
        />
      )}
    </PageContainer>
  );
}
