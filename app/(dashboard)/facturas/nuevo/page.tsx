import PageContainer from "@/components/layout/PageContainer";
import PageHeader from "@/components/layout/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { FacturaForm } from "./FacturaForm";

const EMPRESA_COOKIE = "factura_ia_empresa_activa";

export default async function NuevaFacturaPage() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const empresaCookie = cookieStore.get(EMPRESA_COOKIE)?.value ?? null;

  const [
    { data: proveedores },
    { data: empresas },
    { data: productos },
    { data: formasPago },
  ] = await Promise.all([
    supabase.from("proveedores").select("id, nombre_fantasia").order("nombre_fantasia"),
    supabase.from("empresas").select("id, razon_social").order("razon_social"),
    supabase.from("productos").select("id, nombre, codigo").order("nombre"),
    supabase.from("formas_pago").select("id, nombre").order("nombre"),
  ]);

  const empresasDisponibles = empresas ?? [];
  const empresaActivaId = empresasDisponibles.some((empresa) => empresa.id === empresaCookie)
    ? empresaCookie
    : empresasDisponibles[0]?.id ?? null;

  return (
    <PageContainer>
      <PageHeader title="Nueva factura" description="Registrar una nueva factura de compra." />
      <FacturaForm
        proveedores={proveedores ?? []}
        empresas={empresasDisponibles}
        empresaActivaId={empresaActivaId}
        productos={productos ?? []}
        formasPago={formasPago ?? []}
      />
    </PageContainer>
  );
}
