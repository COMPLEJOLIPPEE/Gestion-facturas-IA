import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UsuariosAdmin from "./UsuariosAdmin";

const rolLabels: Record<string, string> = {
  superadmin: "Super Admin",
  admin: "Administrador",
  usuario: "Usuario",
  consulta: "Consulta",
};

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: accesos, error } = await supabase
    .from("usuario_empresa")
    .select("empresa_id, rol, activo, empresas(id, razon_social)")
    .eq("usuario_id", user.id)
    .eq("activo", true);

  const esSuperAdmin = accesos?.some((acceso) => acceso.rol === "superadmin") ?? false;
  if (!esSuperAdmin) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Configuración</h2>
        <p className="mt-1 text-gray-600">Usuarios, perfiles y accesos por empresa.</p>
      </div>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h3 className="text-xl font-semibold">Mi acceso</h3>
          <p className="text-sm text-gray-500">Cuenta autenticada: {user.email ?? "sin email"}</p>
        </div>

        {error ? (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">No se pudieron cargar los accesos.</div>
        ) : accesos && accesos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-gray-500">
                <tr><th className="px-3 py-3 font-medium">Empresa</th><th className="px-3 py-3 font-medium">Perfil</th><th className="px-3 py-3 font-medium">Estado</th></tr>
              </thead>
              <tbody>
                {accesos.map((acceso) => {
                  const empresa = Array.isArray(acceso.empresas) ? acceso.empresas[0] : acceso.empresas;
                  return <tr key={acceso.empresa_id} className="border-b last:border-0"><td className="px-3 py-4 font-medium">{empresa?.razon_social ?? "Empresa"}</td><td className="px-3 py-4">{rolLabels[acceso.rol] ?? acceso.rol}</td><td className="px-3 py-4">{acceso.activo ? "Activo" : "Inactivo"}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="text-gray-600">No hay accesos activos asociados a esta cuenta.</p>}
      </section>

      <UsuariosAdmin />
    </main>
  );
}
