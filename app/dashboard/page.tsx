import { createClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="min-h-screen bg-gray-100 p-8">

      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Hola 👋
        </h1>

        <p className="text-gray-600">
          {user?.email}
        </p>
      </div>


      <div className="grid gap-6 md:grid-cols-3">

        <div className="rounded-xl bg-white p-6 shadow">
          <p className="text-gray-500">
            Facturas
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            0
          </h2>
        </div>


        <div className="rounded-xl bg-white p-6 shadow">
          <p className="text-gray-500">
            Compras del mes
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            $0
          </h2>
        </div>


        <div className="rounded-xl bg-white p-6 shadow">
          <p className="text-gray-500">
            Pagos pendientes
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            0
          </h2>
        </div>

      </div>


      <div className="mt-8 rounded-xl bg-white p-6 shadow">

        <h2 className="mb-4 text-xl font-bold">
          Últimas facturas
        </h2>

        <p className="text-gray-500">
          Todavía no hay facturas cargadas.
        </p>

      </div>

    </main>
  )
}