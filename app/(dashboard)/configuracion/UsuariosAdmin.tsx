"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Company = { id: string; razon_social: string };
type UserRow = {
  usuario_id: string;
  email: string;
  nombre: string;
  apellido: string;
  empresa_id: string;
  empresa: string;
  rol: string;
  activo: boolean;
  email_confirmado: boolean;
  ultimo_acceso: string | null;
  creado: string | null;
};

const roleLabels: Record<string, string> = {
  superadmin: "Super Admin",
  admin: "Administrador",
  usuario: "Usuario",
  consulta: "Consulta",
};

const roleOptions = ["superadmin", "admin", "usuario", "consulta"];

export default function UsuariosAdmin() {
  const supabase = useMemo(() => createClient(), []);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState({ nombre: "", apellido: "", email: "", empresa_id: "", rol: "usuario" });

  async function call(action: string, payload: Record<string, unknown> = {}) {
    const { data, error } = await supabase.functions.invoke("admin-usuarios", {
      body: { action, ...payload },
    });
    if (error) throw new Error(error.message || "No se pudo completar la operación");
    if (data?.error) throw new Error(data.error);
    return data;
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await call("list");
      setUsers(data.users ?? []);
      setCompanies(data.companies ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los usuarios");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setError("");
    setMessage("");
    setForm({ nombre: "", apellido: "", email: "", empresa_id: companies[0]?.id ?? "", rol: "usuario" });
    setShowCreate(true);
    setEditing(null);
  }

  function openEdit(user: UserRow) {
    setError("");
    setMessage("");
    setForm({ nombre: user.nombre, apellido: user.apellido, email: user.email, empresa_id: user.empresa_id, rol: user.rol });
    setEditing(user);
    setShowCreate(false);
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(""); setMessage("");
    try {
      const data = await call("create", form);
      setMessage(data.message ?? "Usuario creado");
      setShowCreate(false);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo crear el usuario"); }
    finally { setSaving(false); }
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const data = await call("update", {
        usuario_id: editing.usuario_id,
        empresa_actual_id: editing.empresa_id,
        empresa_id: form.empresa_id,
        rol: form.rol,
        activo: editing.activo,
        nombre: form.nombre,
        apellido: form.apellido,
      });
      setMessage(data.message ?? "Usuario actualizado");
      setEditing(null);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo actualizar el usuario"); }
    finally { setSaving(false); }
  }

  async function resetPassword(user: UserRow) {
    if (!confirm(`¿Enviar un correo de restablecimiento a ${user.email}?`)) return;
    setError(""); setMessage("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: "https://gestion-facturas-ia.vercel.app/restablecer-password",
      });
      if (error) throw new Error(error.message);
      setMessage(`Correo de restablecimiento enviado a ${user.email}`);
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo enviar el reset"); }
  }

  async function toggleActive(user: UserRow) {
    if (!confirm(`${user.activo ? "¿Desactivar" : "¿Activar"} el acceso de ${user.email}?`)) return;
    setError(""); setMessage("");
    try {
      const data = await call("update", {
        usuario_id: user.usuario_id,
        empresa_actual_id: user.empresa_id,
        empresa_id: user.empresa_id,
        rol: user.rol,
        activo: !user.activo,
        nombre: user.nombre,
        apellido: user.apellido,
      });
      setMessage(data.message ?? "Estado actualizado");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo cambiar el estado"); }
  }

  async function deleteAccess(user: UserRow) {
    const text = `¿Eliminar el acceso de ${user.email} a ${user.empresa}?${"\n\nSi no tiene otra empresa asignada, también se eliminará su cuenta."}`;
    if (!confirm(text)) return;
    setError(""); setMessage("");
    try {
      const data = await call("delete", { usuario_id: user.usuario_id, empresa_id: user.empresa_id });
      setMessage(data.message ?? "Acceso eliminado");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo eliminar el acceso"); }
  }

  const filtered = users.filter((u) => `${u.nombre} ${u.apellido} ${u.email} ${u.empresa} ${u.rol}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <section className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-semibold">Usuarios</h3>
          <p className="mt-1 text-sm text-gray-500">Administrá cuentas, perfiles y accesos por empresa.</p>
        </div>
        <button onClick={openCreate} className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">+ Nuevo usuario</button>
      </div>

      {message && <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{message}</div>}
      {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="mt-5">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, email, empresa o rol..." className="w-full rounded-lg border px-4 py-2 text-sm outline-none focus:border-black" />
      </div>

      {showCreate && (
        <form onSubmit={submitCreate} className="mt-5 rounded-xl border bg-gray-50 p-5">
          <div className="mb-4 flex items-center justify-between"><h4 className="font-semibold">Nuevo usuario</h4><button type="button" onClick={() => setShowCreate(false)} className="text-sm text-gray-500">Cancelar</button></div>
          <div className="grid gap-4 md:grid-cols-2">
            <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre" className="rounded-lg border bg-white px-3 py-2 text-sm" />
            <input value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} placeholder="Apellido" className="rounded-lg border bg-white px-3 py-2 text-sm" />
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className="rounded-lg border bg-white px-3 py-2 text-sm" />
            <select required value={form.empresa_id} onChange={(e) => setForm({ ...form, empresa_id: e.target.value })} className="rounded-lg border bg-white px-3 py-2 text-sm"><option value="">Empresa</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}</select>
            <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })} className="rounded-lg border bg-white px-3 py-2 text-sm">{roleOptions.map((r) => <option key={r} value={r}>{roleLabels[r]}</option>)}</select>
          </div>
          <p className="mt-3 text-xs text-gray-500">No se solicita contraseña. Se enviará un correo de invitación para que el usuario configure su acceso.</p>
          <button disabled={saving} className="mt-4 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? "Creando..." : "Crear usuario y enviar invitación"}</button>
        </form>
      )}

      {editing && (
        <form onSubmit={submitEdit} className="mt-5 rounded-xl border bg-gray-50 p-5">
          <div className="mb-4 flex items-center justify-between"><div><h4 className="font-semibold">Editar usuario</h4><p className="text-xs text-gray-500">{editing.email}</p></div><button type="button" onClick={() => setEditing(null)} className="text-sm text-gray-500">Cancelar</button></div>
          <div className="grid gap-4 md:grid-cols-2">
            <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre" className="rounded-lg border bg-white px-3 py-2 text-sm" />
            <input value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} placeholder="Apellido" className="rounded-lg border bg-white px-3 py-2 text-sm" />
            <select required value={form.empresa_id} onChange={(e) => setForm({ ...form, empresa_id: e.target.value })} className="rounded-lg border bg-white px-3 py-2 text-sm">{companies.map((c) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}</select>
            <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })} className="rounded-lg border bg-white px-3 py-2 text-sm">{roleOptions.map((r) => <option key={r} value={r}>{roleLabels[r]}</option>)}</select>
          </div>
          <button disabled={saving} className="mt-4 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? "Guardando..." : "Guardar cambios"}</button>
        </form>
      )}

      <div className="mt-5 overflow-x-auto rounded-lg border">
        {loading ? <div className="p-8 text-center text-sm text-gray-500">Cargando usuarios...</div> : filtered.length === 0 ? <div className="p-8 text-center text-sm text-gray-500">No hay usuarios que coincidan con la búsqueda.</div> : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500"><tr><th className="px-3 py-3">Usuario</th><th className="px-3 py-3">Empresa</th><th className="px-3 py-3">Rol</th><th className="px-3 py-3">Estado</th><th className="px-3 py-3">Acciones</th></tr></thead>
            <tbody>{filtered.map((u) => <tr key={`${u.usuario_id}-${u.empresa_id}`} className="border-t">
              <td className="px-3 py-4"><div className="font-medium">{u.nombre || u.apellido ? `${u.nombre} ${u.apellido}`.trim() : "Sin nombre"}</div><div className="text-xs text-gray-500">{u.email}</div><div className="mt-1 text-xs">{u.email_confirmado ? "✓ Email confirmado" : "• Invitación pendiente"}</div></td>
              <td className="px-3 py-4">{u.empresa}</td>
              <td className="px-3 py-4">{roleLabels[u.rol] ?? u.rol}</td>
              <td className="px-3 py-4"><span className={`rounded-full px-2 py-1 text-xs font-medium ${u.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{u.activo ? "Activo" : "Inactivo"}</span></td>
              <td className="px-3 py-4"><div className="flex flex-wrap gap-2"><button onClick={() => openEdit(u)} className="rounded border px-2 py-1 text-xs hover:bg-gray-50">Editar</button><button onClick={() => resetPassword(u)} className="rounded border px-2 py-1 text-xs hover:bg-gray-50">Reset contraseña</button><button onClick={() => toggleActive(u)} className="rounded border px-2 py-1 text-xs hover:bg-gray-50">{u.activo ? "Desactivar" : "Activar"}</button><button onClick={() => deleteAccess(u)} className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50">Eliminar acceso</button></div></td>
            </tr>)}</tbody>
          </table>
        )}
      </div>
      <p className="mt-3 text-xs text-gray-400">Mostrando {filtered.length} asignaciones de acceso.</p>
    </section>
  );
}
