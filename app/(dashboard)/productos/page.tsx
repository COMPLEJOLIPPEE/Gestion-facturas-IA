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

type SearchParams = { q?: string; estado?: string; categoria?: string };

export default async function ProductosPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const supabase = await createClient();
  const role = await getCurrentRole();
  const writable = canWrite(role);
  const params = (await searchParams) ?? {};
  const search = String(params.q ?? "").trim();
  const estado = String(params.estado ?? "");
  const categoria = String(params.categoria ?? "");

  const { data: categoriasData } = await supabase.from("categorias_productos").select("id, nombre").order("nombre");

  let query = supabase
    .from("productos")
    .select(`id, codigo, nombre, unidad_medida, costo_actual, ultimo_costo, precio_venta, activo, categoria_id, categorias_productos (nombre)`)
    .order("nombre");

  if (search) {
    const termino = search.replace(/,/g, " ").replace(/%/g, "").trim();
    query = query.or(`nombre.ilike.%${termino}%,codigo.ilike.%${termino}%`);
  }
  if (estado === "activo") query = query.eq("activo", true);
  if (estado === "inactivo") query = query.eq("activo", false);
  if (categoria === "sin_categoria") query = query.is("categoria_id", null);
  else if (categoria) query = query.eq("categoria_id", categoria);

  const { data, error } = await query;
  if (error) return <Alert variant="error">Error cargando productos: {error.message}</Alert>;

  const productos: Producto[] = (data ?? []).map((p) => ({
    id: p.id,
    codigo: p.codigo ?? "",
    nombre: p.nombre,
    unidad_medida: p.unidad_medida ?? "",
    costo_actual: p.costo_actual ?? 0,
    ultimo_costo: Number((p as unknown as { ultimo_costo?: number | null }).ultimo_costo ?? 0),
    precio_venta: p.precio_venta ?? 0,
    activo: Boolean(p.activo),
    categorias_productos: Array.isArray(p.categorias_productos) ? p.categorias_productos[0] ?? null : p.categorias_productos ?? null,
  }));

  const categorias = (categoriasData ?? []).map((c) => ({ id: c.id, nombre: c.nombre }));

  return (
    <PageContainer>
      <PageHeader title="Productos" description="Gestión de productos" actions={writable ? <Link href="/productos/nuevo"><Button><Plus className="mr-2 h-4 w-4" />Nuevo producto</Button></Link> : undefined} />
      {writable ? <ProductosTable productos={productos} search={search} estado={estado} categoria={categoria} categorias={categorias} /> : <DataTable columns={columns} data={productos} onView={(p) => `/productos/${p.id}`} />}
    </PageContainer>
  );
}