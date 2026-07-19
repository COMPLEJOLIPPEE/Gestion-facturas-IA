import { createClient } from "@/lib/supabase/server"
import Link from "next/link"


export default async function ProveedoresPage() {

  const supabase = await createClient()


  const { data: proveedores, error } = await supabase
    .from("proveedores")
    .select(`
      id,
      nombre_fantasia,
      razon_social,
      cuit,
      activo,
      etiqueta_1,
      etiqueta_2,
      categorias_proveedor (
        nombre
      )
    `)
    .order("nombre_fantasia")



  if (error) {
    console.log("Error cargando proveedores:", error)
  }



  return (
    <div>


      <div className="mb-6 flex items-center justify-between">


        <div>

          <h1 className="text-3xl font-bold">
            🚚 Proveedores
          </h1>


          <p className="mt-2 text-gray-600">
            Gestión de proveedores
          </p>


        </div>



        <Link
          href="/proveedores/nuevo"
          className="rounded bg-black px-4 py-2 text-white hover:opacity-80"
        >
          + Nuevo proveedor
        </Link>


      </div>





      <div className="overflow-hidden rounded-xl bg-white shadow">


        <table className="w-full">


          <thead className="bg-gray-100">


            <tr>

              <th className="p-3 text-left">
                Nombre fantasía
              </th>


              <th className="p-3 text-left">
                Razón social
              </th>


              <th className="p-3 text-left">
                Categoría
              </th>


              <th className="p-3 text-left">
                Etiquetas
              </th>


              <th className="p-3 text-left">
                Estado
              </th>


              <th className="p-3 text-left">
                Acciones
              </th>


            </tr>


          </thead>




          <tbody>


            {proveedores?.map((proveedor) => (


              <tr
                key={proveedor.id}
                className="border-t"
              >


                <td className="p-3">
                  {proveedor.nombre_fantasia}
                </td>



                <td className="p-3">
                  {proveedor.razon_social}
                </td>



                <td className="p-3">
                  {proveedor.categorias_proveedor?.[0]?.nombre}
                </td>



                <td className="p-3">
                  {proveedor.etiqueta_1}
                  <br />
                  {proveedor.etiqueta_2}
                </td>



                <td className="p-3">

                  {proveedor.activo
                    ? "✅ Activo"
                    : "❌ Inactivo"
                  }

                </td>



                <td className="p-3 flex gap-2">


                  <Link
                    href={`/proveedores/${proveedor.id}`}
                    className="rounded bg-gray-200 px-3 py-1 text-sm hover:bg-gray-300"
                  >
                    👁 Ver
                  </Link>



                  <Link
                    href={`/proveedores/${proveedor.id}/editar`}
                    className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:opacity-80"
                  >
                    ✏️ Editar
                  </Link>



                </td>



              </tr>


            ))}


          </tbody>


        </table>


      </div>


    </div>
  )
}