import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const EMPRESA_COOKIE = "factura_ia_empresa_activa";

export type Rol = "superadmin" | "admin" | "consulta";

export async function getCurrentRole(): Promise<Rol | null> {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const empresaCookie = cookieStore.get(EMPRESA_COOKIE)?.value ?? null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: accesos } = await supabase
    .from("usuario_empresa")
    .select("empresa_id, rol")
    .eq("usuario_id", user.id)
    .eq("activo", true);

  if (!accesos?.length) return null;

  const acceso =
    accesos.find((item) => item.empresa_id === empresaCookie) ?? accesos[0];

  const rol = acceso?.rol;

  if (rol === "superadmin" || rol === "admin" || rol === "consulta") {
    return rol;
  }

  return null;
}

export function canWrite(role: Rol | null): boolean {
  return role === "superadmin" || role === "admin";
}
