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
        <option value="">Seleccionar categoría</option>

        {categorias.map((categoria) => (
          <option
            key={categoria.id}
            value={categoria.id}
          >
            {categoria.nombre}
          </option>
        ))}
      </select>

      <select
        name="condicion_iva"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Condición IVA</option>
        <option>Responsable Inscripto</option>
        <option>Monotributista</option>
        <option>Exento</option>
        <option>Consumidor Final</option>
      </select>

      <select
        name="condicion_pago"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Condición de pago</option>
        <option>Contado</option>
        <option>7 días</option>
        <option>15 días</option>
        <option>30 días</option>
        <option>Transferencia</option>
      </select>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-gray-800">Ingresos Brutos (IIBB)</h3>
          <p className="mt-1 text-xs text-gray-500">Indicá el porcentaje habitual que corresponde a este proveedor según jurisdicción.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="iibb_bsas" className="mb-1 block text-sm font-medium text-gray-700">IIBB Buenos Aires (%)</label>
            <Input
              id="iibb_bsas"
              type="number"
              step="0.01"
              min="0"
              name="iibb_bsas"
              defaultValue={0}
              placeholder="Ej.: 3,50"
            />
          </div>
          <div>
            <label htmlFor="iibb_caba" className="mb-1 block text-sm font-medium text-gray-700">IIBB CABA (%)</label>
            <Input
              id="iibb_caba"
              type="number"
              step="0.01"
              min="0"
              name="iibb_caba"
              defaultValue={0}
              placeholder="Ej.: 3,00"
            />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="otros_cargos" className="mb-1 block text-sm font-medium text-gray-700">Otros cargos habituales</label>
        <Input
          id="otros_cargos"
          name="otros_cargos"
          placeholder="Ej.: flete, seguro u otro cargo"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="etiqueta_1" className="mb-1 block text-sm font-medium text-gray-700">Etiqueta 1</label>
          <Input id="etiqueta_1" name="etiqueta_1" placeholder="Etiqueta" />
        </div>
        <div>
          <label htmlFor="etiqueta_2" className="mb-1 block text-sm font-medium text-gray-700">Etiqueta 2</label>
          <Input id="etiqueta_2" name="etiqueta_2" placeholder="Etiqueta" />
        </div>
      </div>

      <SubmitButton>
        Guardar proveedor
      </SubmitButton>
    </form>
  );
}