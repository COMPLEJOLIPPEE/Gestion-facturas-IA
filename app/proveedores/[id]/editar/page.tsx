import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"


export default async function EditarProveedorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {


  const { id } = await params


  const supabase = await createClient()



  const { data: proveedor, error } = await supabase
    .from("proveedores")
    .select("*")
    .eq("id", id)
    .single()



  if (error || !proveedor) {
    console.log("Error buscando proveedor:", error)
    notFound()
  }




  const { data: categorias } = await supabase
    .from("categorias_proveedor")
    .select("id,nombre")
    .order("nombre")





  async function actualizarProveedor(formData: FormData) {
    "use server"


    const supabase = await createClient()



    const { error } = await supabase
      .from("proveedores")
      .update({

        nombre_fantasia: formData.get("nombre_fantasia"),
        razon_social: formData.get("razon_social"),
        cuit: formData.get("cuit"),
        telefono: formData.get("telefono"),
        email: formData.get("email"),
        categoria_id: formData.get("categoria_id"),
        etiqueta_1: formData.get("etiqueta_1"),
        etiqueta_2: formData.get("etiqueta_2"),
        condicion_pago: formData.get("condicion_pago"),

      })
      .eq("id", id)




    if (error) {
      console.log("Error actualizando proveedor:", error)
      return
    }



    redirect(`/proveedores/${id}`)

  }





  return (

    <div>


      <h1 className="mb-6 text-3xl font-bold">
        ✏️ Editar proveedor
      </h1>




      <form
        action={actualizarProveedor}
        className="max-w-xl space-y-4"
      >



        <input
          name="nombre_fantasia"
          defaultValue={proveedor.nombre_fantasia}
          placeholder="Nombre fantasía"
          className="w-full rounded border p-2"
          required
        />



        <input
          name="razon_social"
          defaultValue={proveedor.razon_social}
          placeholder="Razón social"
          className="w-full rounded border p-2"
          required
        />



        <input
          name="cuit"
          defaultValue={proveedor.cuit}
          placeholder="CUIT"
          className="w-full rounded border p-2"
        />



        <input
          name="telefono"
          defaultValue={proveedor.telefono}
          placeholder="Teléfono"
          className="w-full rounded border p-2"
        />



        <input
          name="email"
          defaultValue={proveedor.email}
          placeholder="Email"
          className="w-full rounded border p-2"
        />



        <select
          name="categoria_id"
          defaultValue={proveedor.categoria_id}
          className="w-full rounded border p-2"
        >

          <option value="">
            Seleccionar categoría
          </option>


          {categorias?.map((categoria) => (

            <option
              key={categoria.id}
              value={categoria.id}
            >
              {categoria.nombre}
            </option>

          ))}


        </select>




        <input
          name="etiqueta_1"
          defaultValue={proveedor.etiqueta_1}
          placeholder="Etiqueta 1"
          className="w-full rounded border p-2"
        />



        <input
          name="etiqueta_2"
          defaultValue={proveedor.etiqueta_2}
          placeholder="Etiqueta 2"
          className="w-full rounded border p-2"
        />



        <input
          name="condicion_pago"
          defaultValue={proveedor.condicion_pago}
          placeholder="Condición de pago"
          className="w-full rounded border p-2"
        />




        <button
          type="submit"
          className="rounded bg-black px-5 py-2 text-white"
        >
          Guardar cambios
        </button>




      </form>


    </div>

  )
}