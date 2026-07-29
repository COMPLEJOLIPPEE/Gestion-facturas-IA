"use client";

import { Alert, Input } from "@/components/ui";
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
      className="mt-6 grid max-w-xl gap-4 rounded-xl bg-white p-6 shadow"
    >
      <Alert variant="info">
        El código del producto se genera automáticamente.
      </Alert>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Nombre
        </label>

        <Input
          name="nombre"
          required
          placeholder="Ingrese el nombre del producto"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Unidad de medida
        </label>

        <Input
          name="unidad_medida"
          placeholder="Ej: Kg, Lt, Unidad"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Categoría
        </label>

        <select
          name="categoria_id"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Sin categoría</option>

          {categorias.map((categoria) => (
            <option
              key={categoria.id}
              value={categoria.id}
            >
              {categoria.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Costo
          </label>

          <Input
            type="number"
            step="0.01"
            name="costo_actual"
            defaultValue={0}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Precio de venta
          </label>

          <Input
            type="number"
            step="0.01"
            name="precio_venta"
            defaultValue={0}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          IVA
        </label>

        <Input
          type="number"
          step="0.01"
          name="iva"
          defaultValue={21}
        />
      </div>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="activo"
          defaultChecked
        />

        Activo
      </label>

      <SubmitButton />
    </form>
  );
}