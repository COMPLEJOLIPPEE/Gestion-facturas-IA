"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RestablecerPasswordPage() {
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setMessage("");
    if (password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }
    if (password !== confirm) { setError("Las contraseñas no coinciden."); return; }
    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) setError(updateError.message);
    else { setMessage("Contraseña actualizada correctamente. Ya podés ingresar al sistema."); setPassword(""); setConfirm(""); }
    setSaving(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-md rounded-xl border bg-white p-7 shadow-sm">
        <h1 className="text-2xl font-bold">Restablecer contraseña</h1>
        <p className="mt-2 text-sm text-gray-600">Elegí una nueva contraseña para tu cuenta.</p>
        {error && <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {message && <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{message}</div>}
        {!ready && !message ? <div className="mt-6 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">Validando el enlace...</div> : !message && (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div><label className="mb-1 block text-sm font-medium">Nueva contraseña</label><input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border px-3 py-2" /></div>
            <div><label className="mb-1 block text-sm font-medium">Repetir contraseña</label><input required type="password" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full rounded-lg border px-3 py-2" /></div>
            <button disabled={saving} className="w-full rounded-lg bg-black px-4 py-2.5 font-medium text-white disabled:opacity-50">{saving ? "Guardando..." : "Guardar nueva contraseña"}</button>
          </form>
        )}
      </div>
    </main>
  );
}
