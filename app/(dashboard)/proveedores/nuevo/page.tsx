import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function NuevoProveedorPage() {

  const supabase = await createClient()

  const { data: categorias, error: categoriasError } = await supabase
    .from("categorias_proveedor")
    .select("id,nombre")
    .order("nombre")


  if (categoriasError) {
    console.log("Error cargando categorías:", categoriasError)
  }


  async function crearProveedor(formData: FormData) {
    "use server"

    const supabase = await createClient()


    const categoriaId = formData.get("categoria_id")


    if (!categoriaId || categoriaId === "") {
      console.log("No se seleccionó categoría")
      return
    }


    const { error } = await supabase
      .from("proveedores")
      .insert({
        nombre_fantasia: formData.get("nombre_fantasia"),
        razon_social: formData.get("razon_social"),
        cuit: formData.get("cuit"),
        telefono: formData.get("telefono"),
        email: formData.get("email"),
        categoria_id: categoriaId,
        etiqueta_1: formData.get("etiqueta_1"),
        etiqueta_2: formData.get("etiqueta_2"),
        condicion_pago: formData.get("condicion_pago"),
        activo: true,
      })


    if (error) {
      console.log("Error guardando proveedor:", error)
      return
    }


    console.log("Proveedor creado correctamente")

    redirect("/proveedores")
  }


  return (
    <div>

      <h1 className="text-3xl font-bold mb-6">
        Nuevo proveedor
      </h1>


      <form
        action={crearProveedor}
        className="space-y-4 max-w-xl"
      >

        <input
          name="nombre_fantasia"
          placeholder="Nombre fantasía"
          className="w-full rounded border p-2"
          required
        />


        <input
          name="razon_social"
          placeholder="Razón social"
          className="w-full rounded border p-2"
          required
        />


        <input
          name="cuit"
          placeholder="CUIT"
          className="w-full rounded border p-2"
        />


        <input
          name="telefono"
          placeholder="Teléfono"
          className="w-full rounded border p-2"
        />


        <input
          name="email"
          placeholder="Email"
          className="w-full rounded border p-2"
        />


        <select
          name="categoria_id"
          className="w-full rounded border p-2"
          required
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
          placeholder="Etiqueta 1"
          className="w-full rounded border p-2"
        />


        <input
          name="etiqueta_2"
          placeholder="Etiqueta 2"
          className="w-full rounded border p-2"
        />


        <input
          name="condicion_pago"
          placeholder="Condición de pago"
          className="w-full rounded border p-2"
        />


        <button
          type="submit"
          className="rounded bg-black px-5 py-2 text-white"
        >
          Guardar proveedor
        </button>


      </form>

    </div>
  )
}