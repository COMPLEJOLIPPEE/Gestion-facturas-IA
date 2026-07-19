"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")

  async function updatePassword() {
    const supabase = createClient()

    const { error } = await supabase.auth.updateUser({
      password,
    })

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage("Contraseña actualizada correctamente")
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">

        <h1 className="mb-6 text-center text-2xl font-bold">
          Nueva contraseña
        </h1>

        <input
          type="password"
          placeholder="Nueva contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded border p-2"
        />

        <button
          onClick={updatePassword}
          className="w-full rounded bg-black p-2 text-white"
        >
          Cambiar contraseña
        </button>

        {message && (
          <p className="mt-4 text-center">
            {message}
          </p>
        )}

      </div>
    </main>
  )
}
