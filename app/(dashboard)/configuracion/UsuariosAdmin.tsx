"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type UserRow = {
  usuario_id: string;
  auth_user_id: string;
  email: string;
  nombre: string;
  apellido: string;
  empresa_id: string;
  empresa_nombre: string;
  rol: "superadmin" | "admin" | "usuario" | "consulta";
  activo: boolean;
};

type Company = { id: string; nombre: string };

const ROLES: { value: UserRow["rol"]; label: string }[] = [
  { value: "superadmin", label: "Super Admin" },
  { value: "admin", label: "Administrador" },
  { value: "usuario", label: "Usuario" },
  { value: "consulta", label: "Consulta" },
];

export default function UsuariosAdmin() {
  const supabase = createClient();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState({ nombre: "", apellido: "", email: "", empresa_id: "", rol: "usuario" as UserRow["rol"] });

  async function call(action: string, body: Record<string, unknown> = {}) {
    const { data, error } = await supabase.functions.invoke("admin-usuarios", { body: { action, ...body } });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  }

  async function load() {
    setLoading(true); setError("");
    try {
      const data = await call("list");
      setUsers(data.users ?? []);
      setCompanies(data.companies ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo cargar usuarios"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function resetForm() {
    setForm({ nombre: "", apellido: "", email: "", empresa_id: companies[0]?.id ?? "", rol: "usuario" });
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const data = await call("create", form);
      setMessage(data.message ?? "Invitación enviada");
      setShowCreate(false); resetForm(); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo crear el usuario"); }
    finally { setSaving(false); }
  }

  function startEdit(user: UserRow) {
    setEditing(user); setForm({ nombre: user.nombre ?? "", apellido: user.apellido ?? "", email: user.email, empresa_id: user.empresa_id, rol: user.rol }); setError(""); setMessage("");
  }

  async function updateUser(e: React.FormEvent) {
    e.preventDefault(); if (!editing) return; setSaving(true); setError(""); setMessage("");
    try {
      const data = await call("update", { usuario_id: editing.usuario_id, empresa_actual_id: editing.empresa_id, empresa_id: form.empresa_id, rol: form.rol, activo: editing.activo, nombre: form.nombre, apellido: form.apellido });
      setMessage(data.message ?? "Usuario actualizado"); setEditing(null); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo actualizar el usuario"); }
    finally { setSaving(false); }
  }

  async function resetPassword(user: UserRow) {
    if (!confirm(`¿Enviar un correo de restablecimiento a ${user.email}?`)) return;
    setError(""); setMessage("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: "https://gestion-facturas-ia.vercel.app/auth/callback?next=/restablecer-password",
      });
      if (error) throw new Error(error.message);
      setMessage(`Correo de restablecimiento enviado a ${user.email}`);
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo enviar el reset"); }
  }

  async function toggleActive(user: UserRow) {
    if (!confirm(`${user.activo ? "¿Desactivar" : "¿Activar"} el acceso de ${user.email}?`)) return;
    setError(""); setMessage("");
    try {
      const data = await call("update", { usuario_id: user.usuario_id, empresa_actual_id: user.empresa_id, empresa_id: user.empresa_id, rol: user.rol, activo: !user.activo, nombre: user.nombre, apellido: user.apellido });
      setMessage(data.message ?? "Estado actualizado"); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo actualizar el estado"); }
  }

  async function deleteAccess(user: UserRow) {
    if (!confirm(`¿Eliminar el acceso de ${user.email} a esta empresa?`)) return;
    setError(""); setMessage("");
    try {
      const data = await call("delete", { usuario_id: user.usuario_id, empresa_id: user.empresa_id });
      setMessage(data.message ?? "Acceso eliminado"); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo eliminar el acceso"); }
  }

  const filtered = users.filter(u => `${u.nombre} ${u.apellido} ${u.email} ${u.empresa_nombre}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold">Usuarios</h1><p className="text-sm text-gray-600">Administración de accesos al sistema.</p></div>
        <button onClick={() => { resetForm(); setShowCreate(true); setEditing(null); }} className="rounded-lg bg-black px-4 py-2.5 font-medium text-white">+ Nuevo usuario</button>
      </div>
      {message && <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{message}</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, email o empresa..." className="w-full rounded-lg border bg-white px-3 py-2.5" />
      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full text-sm"><thead className="bg-gray-50 text-left"><tr><th className="px-4 py-3">Usuario</th><th className="px-4 py-3">Empresa</th><th className="px-4 py-3">Rol</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3 text-right">Acciones</th></tr></thead>
          <tbody>{loading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Cargando...</td></tr> : filtered.map(user => <tr key={user.usuario_id} className="border-t"><td className="px-4 py-3"><div className="font-medium">{user.nombre} {user.apellido}</div><div className="text-xs text-gray-500">{user.email}</div></td><td className="px-4 py-3">{user.empresa_nombre}</td><td className="px-4 py-3">{ROLES.find(r => r.value === user.rol)?.label ?? user.rol}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${user.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{user.activo ? "Activo" : "Inactivo"}</span></td><td className="px-4 py-3 text-right"><div className="flex flex-wrap justify-end gap-2"><button onClick={() => startEdit(user)} className="rounded border px-2.5 py-1.5">Editar</button><button onClick={() => resetPassword(user)} className="rounded border px-2.5 py-1.5">Reset contraseña</button><button onClick={() => toggleActive(user)} className="rounded border px-2.5 py-1.5">{user.activo ? "Desactivar" : "Activar"}</button><button onClick={() => deleteAccess(user)} className="rounded border border-red-200 px-2.5 py-1.5 text-red-600">Eliminar acceso</button></div></td></tr>)}</tbody>
        </table>
      </div>
      {(showCreate || editing) && <div className="rounded-xl border bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">{editing ? "Editar usuario" : "Nuevo usuario"}</h2>{!editing && <p className="mt-1 text-sm text-gray-500">Se enviará una invitación por email para que configure su contraseña.</p>}<form onSubmit={editing ? updateUser : createUser} className="mt-5 grid gap-4 sm:grid-cols-2"><div><label className="mb-1 block text-sm font-medium">Nombre</label><input required value={form.nombre} onChange={e => setForm({...form,nombre:e.target.value})} className="w-full rounded-lg border px-3 py-2" /></div><div><label className="mb-1 block text-sm font-medium">Apellido</label><input value={form.apellido} onChange={e => setForm({...form,apellido:e.target.value})} className="w-full rounded-lg border px-3 py-2" /></div>{!editing && <div><label className="mb-1 block text-sm font-medium">Email</label><input required type="email" value={form.email} onChange={e => setForm({...form,email:e.target.value})} className="w-full rounded-lg border px-3 py-2" /></div>}<div><label className="mb-1 block text-sm font-medium">Empresa</label><select required value={form.empresa_id} onChange={e => setForm({...form,empresa_id:e.target.value})} className="w-full rounded-lg border px-3 py-2"><option value="">Seleccionar...</option>{companies.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div><div><label className="mb-1 block text-sm font-medium">Rol</label><select value={form.rol} onChange={e => setForm({...form,rol:e.target.value as UserRow["rol"]})} className="w-full rounded-lg border px-3 py-2">{ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select></div><div className="flex gap-2 sm:col-span-2"><button disabled={saving} className="rounded-lg bg-black px-4 py-2.5 font-medium text-white disabled:opacity-50">{saving ? "Guardando..." : editing ? "Guardar cambios" : "Enviar invitación"}</button><button type="button" onClick={() => {setShowCreate(false);setEditing(null)}} className="rounded-lg border px-4 py-2.5">Cancelar</button></div></form></div>}
    </div>
  );
}
