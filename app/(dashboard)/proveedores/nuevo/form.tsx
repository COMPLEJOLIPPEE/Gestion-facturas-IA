"use client";

import { Input } from "@/components/ui";
import SubmitButton from "./submitbutton";

type Categoria = {
  id: string;
  nombre: string;
};

type Props = {
  categorias: Categoria[];
  action: (formData: FormData) => void;
};

export default function Form({
  categorias,
  action,
}: Props) {
  return (
    <form
      action={action}
      className="grid max-w-xl gap-4 rounded-xl bg-white p-6 shadow"
    >
      <Input
        name="nombre_fantasia"
        placeholder="Nombre fantasía"
        required
      />

      <Input
        name="razon_social"
        placeholder="Razón social"
        required
      />

      <Input
        name="cuit"
        placeholder="CUIT"
      />

      <Input
        name="telefono"
        placeholder="Teléfono"
      />

      <Input
        type="email"
        name="email"
        placeholder="Email"
      />

      <select
        name="categoria_id"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        required
      >
        <option value="">
          Seleccionar categoría
        </option>

        {categorias.map((categoria) => (
          <option
            key={categoria.id}
            value={categoria.id}
          >
            {categoria.nombre}
          </option>
        ))}
      </select>

      <Input
        name="etiqueta_1"
        placeholder="Etiqueta 1"
      />

      <Input
        name="etiqueta_2"
        placeholder="Etiqueta 2"
      />

      <Input
        name="condicion_pago"
        placeholder="Condición de pago"
      />

      <SubmitButton>
        Guardar proveedor
      </SubmitButton>
    </form>
  );
}