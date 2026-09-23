import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { Alert, Button } from "@/components/ui";
import PageContainer from "@/components/layout/PageContainer";
import PageHeader from "@/components/layout/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { canWrite, getCurrentRole } from "@/lib/auth/permissions";
import EmpleadosTable from "./EmpleadosTable";

type SearchParams = { q?: string; estado?: string };
type Empleado = {
  id: string; nombre: string; apellido: string; documento: string | null;
  telefono: string | null; email: string | null; fecha_ingreso: string | null;
  activo: boolean; periodicidad_pago: string | null;
};

export default async function EmpleadosPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const supabase = await createClient();
  const role = await getCurrentRole();
  const writable = canWrite(role);
  const params = (await searchParams) ?? {};
  const search = String(params.q ?? "").trim();
  const estado = String(params.estado ?? "");
  let query = supabase.from("empleados")
    .select("id, nombre, apellido, documento, telefono, email, fecha_ingreso, activo, periodicidad_pago")
    .order("apellido").order("nombre");
  if (search) {
    const termino = search.replace(/,/g, " ").replace(/%/g, "").trim();
    query = query.or(`nombre.ilike.%${termino}%,apellido.ilike.%${termino}%,documento.ilike.%${termino}%`);
  }
  if (estado === "activo") query = query.eq("activo", true);
  if (estado === "inactivo") query = query.eq("activo", false);
  const { data, error } = await query;
  if (error) return <Alert variant="error">Error cargando empleados: {error.message}</Alert>;
  return (
    <PageContainer>
      <PageHeader title="Empleados" description="Gestión del personal, estado y periodicidad de pago"
        icon={<Users className="h-6 w-6" />}
        actions={writable ? <Link href="/empleados/nuevo"><Button><Plus className="mr-2 h-4 w-4" />Nuevo empleado</Button></Link> : undefined}
      />
      <EmpleadosTable empleados={(data ?? []) as Empleado[]} writable={writable} search={search} estado={estado} />
    </PageContainer>
  );
}
