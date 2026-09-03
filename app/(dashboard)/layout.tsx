import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./dashboard/actions";
import DashboardNav from "./DashboardNav";

const EMPRESA_COOKIE = "factura_ia_empresa_activa";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const empresaCookie = cookieStore.get(EMPRESA_COOKIE)?.value ?? null;
  const { data: { user } } = await supabase.auth.getUser();

  const { data: accesos } = user
    ? await supabase
        .from("usuario_empresa")
        .select("empresa_id, rol, empresas(id, razon_social)")
        .eq("usuario_id", user.id)
        .eq("activo", true)
    : { data: [] };

  const empresas = (accesos ?? [])
    .map((acceso) => {
      const empresa = Array.isArray(acceso.empresas) ? acceso.empresas[0] : acceso.empresas;
      return empresa
        ? { id: empresa.id, razon_social: empresa.razon_social }
        : null;
    })
    .filter((empresa): empresa is { id: string; razon_social: string } => Boolean(empresa));

  const empresaActivaId = empresas.some((empresa) => empresa.id === empresaCookie)
    ? empresaCookie
    : empresas[0]?.id ?? null;

  const rolActual =
    accesos?.find((acceso) => acceso.empresa_id === empresaActivaId)?.rol ?? "consulta";

  const nombreUsuario =
    String(user?.user_metadata?.nombre ?? user?.user_metadata?.name ?? "").trim() ||
    String(user?.user_metadata?.apellido ?? "").trim() ||
    user?.email?.split("@")[0] ||
    "Usuario";

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-100">
      <div className="flex min-h-screen">
        <DashboardNav
          empresas={empresas}
          empresaActivaId={empresaActivaId}
          nombreUsuario={nombreUsuario}
          email={user?.email}
          rolActual={rolActual}
          logout={logout}
        />

        <section className="min-w-0 flex-1 p-4 md:p-8">{children}</section>
      </div>
    </div>
  );
}
