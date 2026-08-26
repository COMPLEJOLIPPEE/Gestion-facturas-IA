"use client";

type Proveedor = { id: string; nombre_fantasia: string };
type Empresa = { id: string; razon_social: string };

type Props = {
  proveedores: Proveedor[];
  empresas: Empresa[];
  empresaActivaId: string | null;
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
  empresaActivaId,
  proveedorId,
  setProveedorId,
  numero,
  setNumero,
  fecha,
  setFecha,
  fechaVencimiento,
  setFechaVencimiento,
}: Props) {
  const empresaActiva = empresas.find((empresa) => empresa.id === empresaActivaId);

  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <h2 className="mb-6 text-xl font-semibold">📄 Datos del comprobante</h2>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-600">Proveedor *</label>
          <select name="proveedor_id" value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} required className="w-full rounded-lg border border-gray-300 p-2">
            <option value="">Seleccionar proveedor</option>
            {proveedores.map((proveedor) => <option key={proveedor.id} value={proveedor.id}>{proveedor.nombre_fantasia}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-600">Empresa activa *</label>
          <div className="flex min-h-10 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm font-medium text-gray-800">
            {empresaActiva?.razon_social ?? "Seleccioná una empresa desde el menú lateral"}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-600">Tipo de comprobante *</label>
          <select name="tipo_comprobante" defaultValue="FACTURA A" className="w-full rounded-lg border border-gray-300 p-2">
            <option>FACTURA A</option>
            <option>FACTURA B</option>
            <option>FACTURA C</option>
            <option>NOTA DE CRÉDITO</option>
            <option>NOTA DE DÉBITO</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-600">Número</label>
          <input name="numero" value={numero} onChange={(e) => setNumero(e.target.value)} className="w-full rounded-lg border border-gray-300 p-2" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-600">Fecha *</label>
          <input type="date" name="fecha" value={fecha} onChange={(e) => setFecha(e.target.value)} required className="w-full rounded-lg border border-gray-300 p-2" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-600">Fecha de vencimiento</label>
          <input type="date" name="fecha_vencimiento" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} className="w-full rounded-lg border border-gray-300 p-2" />
        </div>
      </div>
    </div>
  );
}
