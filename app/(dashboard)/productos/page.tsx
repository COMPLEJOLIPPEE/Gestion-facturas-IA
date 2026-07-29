import Link from "next/link";
import { Package, Plus } from "lucide-react";

import { Alert, Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

import { Producto } from "./columns";
import ProductosTable from "./table";

export default async function ProductosPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("productos")
    .select(`
      id,
      codigo,
      nombre,
      unidad_medida,
      costo_actual,
      precio_venta,
      iva,
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
    iva: p.iva ?? 0,
    activo: Boolean(p.activo),
    categorias_productos: Array.isArray(p.categorias_productos)
      ? p.categorias_productos[0] ?? null
      : p.categorias_productos ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Package className="h-8 w-8" />
            Productos
          </h1>

          <p className="mt-1 text-gray-600">
            Gestión de productos
          </p>
        </div>

        <Button
          asChild
          icon={<Plus className="h-4 w-4" />}
        >
          <Link href="/productos/nuevo">
            Nuevo producto
          </Link>
        </Button>
      </div>

      {/* Próximamente:
          <TableToolbar />
      */}

      <ProductosTable productos={productos} />
    </div>
  );
}