import Link from "next/link";
import { logout } from "./dashboard/actions"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-gray-100">

      <aside className="w-64 bg-white p-6 shadow">

        <h1 className="mb-8 text-xl font-bold">
          Gestion Facturas IA
        </h1>


<nav className="flex flex-col gap-3">

  <Link 
    href="/dashboard"
    className="rounded p-2 hover:bg-gray-100"
  >
    📊 Dashboard
  </Link>

  <Link 
    href="/proveedores"
    className="rounded p-2 hover:bg-gray-100"
  >
    🚚 Proveedores
  </Link>

  <Link 
    href="/productos"
    className="rounded p-2 hover:bg-gray-100"
  >
    📦 Productos
  </Link>

  <Link 
    href="/facturas"
    className="rounded p-2 hover:bg-gray-100"
  >
    📄 Facturas
  </Link>

  <Link 
    href="/remitos"
    className="rounded p-2 hover:bg-gray-100"
  >
    📝 Remitos
  </Link>

  <Link 
    href="/pagos"
    className="rounded p-2 hover:bg-gray-100"
  >
    💰 Pagos
  </Link>

</nav>


        <form action={logout} className="mt-10">

          <button
            className="rounded bg-black px-4 py-2 text-white"
          >
            Cerrar sesión
          </button>

        </form>

      </aside>


      <section className="flex-1 p-8">

        {children}

      </section>

    </div>
  )
}