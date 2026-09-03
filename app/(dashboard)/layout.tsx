import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./dashboard/actions";
import EmpresaSelector from "./empresa/EmpresaSelector";

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
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-64 bg-white p-6 shadow">
        <h1 className="mb-8 text-xl font-bold">Gestion Facturas IA</h1>

        <EmpresaSelector empresas={empresas} empresaActivaId={empresaActivaId} />

        <div className="mb-6 rounded-lg bg-gray-50 p-3 text-sm">
          <div className="font-medium">{nombreUsuario}</div>
          <div className="text-xs text-gray-500">{user?.email}</div>
          <div className="mt-1 capitalize text-gray-600">{rolActual}</div>
        </div>

        <nav className="flex flex-col gap-3">
          <Link href="/dashboard" className="rounded p-2 hover:bg-gray-100">📊 Dashboard</Link>
          <Link href="/proveedores" className="rounded p-2 hover:bg-gray-100">🚚 Proveedores</Link>
          <Link href="/productos" className="rounded p-2 hover:bg-gray-100">📦 Productos</Link>
          <Link href="/facturas" className="rounded p-2 hover:bg-gray-100">📄 Facturas</Link>
          <Link href="/remitos" className="rounded p-2 hover:bg-gray-100">📝 Remitos</Link>
          <Link href="/pagos" className="rounded p-2 hover:bg-gray-100">💰 Pagos</Link>
          {rolActual === "superadmin" && (
            <Link href="/configuracion" className="rounded p-2 hover:bg-gray-100">⚙️ Configuración</Link>
          )}
        </nav>

        <form action={logout} className="mt-10">
          <button className="rounded bg-black px-4 py-2 text-white">Cerrar sesión</button>
        </form>
      </aside>

      <section className="flex-1 p-8">{children}</section>
    </div>
  );
}
