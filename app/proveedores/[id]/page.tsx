import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"


export default async function ProveedorDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {


  const { id } = await params


  const supabase = await createClient()


  const { data: proveedor, error } = await supabase
    .from("proveedores")
    .select(`
      id,
      nombre_fantasia,
      razon_social,
      cuit,
      telefono,
      email,
      etiqueta_1,
      etiqueta_2,
      condicion_pago,
      activo,
      categorias_proveedor (
        nombre
      )
    `)
    .eq("id", id)
    .single()



  if (error || !proveedor) {
    console.log("Error buscando proveedor:", error)
    notFound()
  }



  return (
    <div>


      <div className="mb-6">

        <h1 className="text-3xl font-bold">
          🚚 {proveedor.nombre_fantasia}
        </h1>


        <p className="mt-2 text-gray-600">
          Detalle del proveedor
        </p>

      </div>




      <div className="rounded-xl bg-white p-6 shadow">


        <div className="grid gap-4 md:grid-cols-2">


          <div>
            <p className="text-sm text-gray-500">
              Razón social
            </p>

            <p className="font-medium">
              {proveedor.razon_social}
            </p>
          </div>



          <div>
            <p className="text-sm text-gray-500">
              CUIT
            </p>

            <p className="font-medium">
              {proveedor.cuit}
            </p>
          </div>




          <div>
            <p className="text-sm text-gray-500">
              Teléfono
            </p>

            <p className="font-medium">
              {proveedor.telefono}
            </p>
          </div>




          <div>
            <p className="text-sm text-gray-500">
              Email
            </p>

            <p className="font-medium">
              {proveedor.email}
            </p>
          </div>




          <div>
            <p className="text-sm text-gray-500">
              Categoría
            </p>

            <p className="font-medium">
              {proveedor.categorias_proveedor?.[0]?.nombre}
            </p>
          </div>




          <div>
            <p className="text-sm text-gray-500">
              Condición de pago
            </p>

            <p className="font-medium">
              {proveedor.condicion_pago}
            </p>
          </div>




          <div>
            <p className="text-sm text-gray-500">
              Etiquetas
            </p>

            <p className="font-medium">
              {proveedor.etiqueta_1} {proveedor.etiqueta_2}
            </p>
          </div>




          <div>
            <p className="text-sm text-gray-500">
              Estado
            </p>

            <p className="font-medium">
              {proveedor.activo ? "✅ Activo" : "❌ Inactivo"}
            </p>
          </div>



        </div>



      </div>


    </div>
  )
}