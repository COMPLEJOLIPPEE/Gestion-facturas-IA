"use client";

type Proveedor = {
  id: string;
  nombre_fantasia: string;
};

type Empresa = {
  id: string;
  razon_social: string;
};

type Props = {
  proveedores: Proveedor[];
  empresas: Empresa[];

  proveedorId: string;
  setProveedorId: (value: string) => void;

  numero: string;
  setNumero: (value: string) => void;

  fecha: string;
  setFecha: (value: string) => void;

  fechaVencimiento: string;
  setFechaVencimiento: (value: string) => void;
};

export default function DatosComprobante({
  proveedores,
  empresas,

  proveedorId,
  setProveedorId,

  numero,
  setNumero,

  fecha,
  setFecha,

  fechaVencimiento,
  setFechaVencimiento,
}: Props) {
  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <h2 className="mb-6 text-xl font-semibold">
        📄 Datos del comprobante
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-600">
            Proveedor *
          </label>

          <select
            name="proveedor_id"
            value={proveedorId}
            onChange={(e) => setProveedorId(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 p-2"
          >
            <option value="">
              Seleccionar proveedor
            </option>

            {proveedores.map((proveedor) => (
              <option
                key={proveedor.id}
                value={proveedor.id}
              >
                {proveedor.nombre_fantasia}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-600">
            Empresa *
          </label>

          <select
            name="empresa_id"
            required
            className="w-full rounded-lg border border-gray-300 p-2"
          >
            <option value="">
              Seleccionar empresa
            </option>

            {empresas.map((empresa) => (
              <option
                key={empresa.id}
                value={empresa.id}
              >
                {empresa.razon_social}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-600">
            Tipo de comprobante *
          </label>

          <select
            name="tipo_comprobante"
            defaultValue="FACTURA A"
            className="w-full rounded-lg border border-gray-300 p-2"
          >
            <option>FACTURA A</option>
            <option>FACTURA B</option>
            <option>FACTURA C</option>
            <option>NOTA DE CRÉDITO</option>
            <option>NOTA DE DÉBITO</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-600">
            Número
          </label>

          <input
            name="numero"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-600">
            Fecha *
          </label>

          <input
            type="date"
            name="fecha"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 p-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-600">
            Fecha de vencimiento
          </label>

          <input
            type="date"
            name="fecha_vencimiento"
            value={fechaVencimiento}
            onChange={(e) => setFechaVencimiento(e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-2"
          />
        </div>
      </div>
    </div>
  );
}