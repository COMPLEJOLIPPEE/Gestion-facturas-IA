import { login } from "./actions"

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-3xl font-bold">
          Ingresar
        </h1>

        <form action={login} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Email
            </label>

            <input
              name="email"
              type="email"
              required
              className="w-full rounded border p-2"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Contraseña
            </label>

            <input
              name="password"
              type="password"
              required
              className="w-full rounded border p-2"
              placeholder="********"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded bg-black p-2 text-white hover:opacity-80"
          >
            Ingresar
          </button>
        </form>
      </div>
    </main>
  )
}