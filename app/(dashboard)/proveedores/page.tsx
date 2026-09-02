import Link from "next/link";
import { Plus, Truck } from "lucide-react";

import { Alert, Button } from "@/components/ui";
import PageContainer from "@/components/layout/PageContainer";
import PageHeader from "@/components/layout/PageHeader";
import ProveedoresTable from "./ProveedoresTable";

import { createClient } from "@/lib/supabase/server";
import { canWrite, getCurrentRole } from "@/lib/auth/permissions";

type SearchParams = {
  q?: string;
  estado?: string;
  condicion_iva?: string;
  categoria?: string;
};

type Proveedor = {
  id: string;
  nombre_fantasia: string;
  razon_social: string;
  cuit: string;
  condicion_iva: string | null;
  activo: boolean;
  etiqueta_1: string | null;
  etiqueta_2: string | null;
  categoria_id: string | null;
  categoria_nombre: string | null;
};

export default async function ProveedoresPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const supabase = await createClient();
  const role = await getCurrentRole();
  const writable = canWrite(role);
  const params = (await searchParams) ?? {};
  const search = String(params.q ?? "").trim();
  const estado = String(params.estado ?? "");
  const condicionIva = String(params.condicion_iva ?? "");
  const categoria = String(params.categoria ?? "");

  const { data: categoriasData } = await supabase
    .from("categorias_proveedor")
    .select("id, nombre")
    .order("nombre");

  let query = supabase
    .from("proveedores")
    .select(`
      id,
      nombre_fantasia,
      razon_social,
      cuit,
      condicion_iva,
      activo,
      etiqueta_1,
      etiqueta_2,
      categoria_id,
      categorias_proveedor (nombre)
    `)
    .order("nombre_fantasia");

  if (search) {
    const termino = search.replace(/,/g, " ").replace(/%/g, "").trim();
    query = query.or(`nombre_fantasia.ilike.%${termino}%,razon_social.ilike.%${termino}%,cuit.ilike.%${termino}%`);
  }

  if (estado === "activo") query = query.eq("activo", true);
  if (estado === "inactivo") query = query.eq("activo", false);
  if (condicionIva) query = query.eq("condicion_iva", condicionIva);
  if (categoria) query = query.eq("categoria_id", categoria);

  const { data, error } = await query;

  if (error) {
    return <Alert variant="error">Error cargando proveedores: {error.message}</Alert>;
  }

  const proveedores: Proveedor[] = (data ?? []).map((p) => ({
    id: p.id,
    nombre_fantasia: p.nombre_fantasia,
    razon_social: p.razon_social ?? "",
    cuit: p.cuit ?? "",
    condicion_iva: p.condicion_iva ?? null,
    activo: Boolean(p.activo),
    etiqueta_1: p.etiqueta_1 ?? null,
    etiqueta_2: p.etiqueta_2 ?? null,
    categoria_id: p.categoria_id ?? null,
    categoria_nombre: Array.isArray(p.categorias_proveedor)
      ? p.categorias_proveedor[0]?.nombre ?? null
      : p.categorias_proveedor?.nombre ?? null,
  }));

  const categorias = (categoriasData ?? []).map((categoria) => ({
    id: categoria.id,
    nombre: categoria.nombre,
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

      <ProveedoresTable
        proveedores={proveedores}
        writable={writable}
        search={search}
        estado={estado}
        condicionIva={condicionIva}
        categoria={categoria}
        categorias={categorias}
      />
    </PageContainer>
  );
}
