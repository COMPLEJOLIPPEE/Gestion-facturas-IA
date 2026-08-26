"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function ResetPasswordPage() {
  const router = useRouter()

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault()

    setMessage("")
    setError("")

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.")
      return
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.")
      return
    }

    setLoading(true)

    const supabase = createClient()

    const { error } = await supabase.auth.updateUser({
      password,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setMessage("Contraseña actualizada correctamente.")

    setTimeout(() => {
      router.push("/login")
    }, 1500)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-2 text-center text-2xl font-bold">
          Nueva contraseña
        </h1>

        <p className="mb-6 text-center text-sm text-gray-600">
          Ingresá tu nueva contraseña.
        </p>

        <form onSubmit={updatePassword} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Nueva contraseña
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded border p-2"
              placeholder="********"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Repetir contraseña
            </label>

            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded border p-2"
              placeholder="********"
            />
          </div>

          {error && (
            <div className="rounded bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded bg-green-50 p-3 text-sm text-green-700">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-black p-2 text-white hover:opacity-80 disabled:opacity-50"
          >
            {loading ? "Actualizando..." : "Cambiar contraseña"}
          </button>
        </form>
      </div>
    </main>
  )
}