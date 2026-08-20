import Link from "next/link"

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
  buscar?: string;
  proveedor?: string;
  empresa?: string;
  estado?: string;
};

export default function RemitosFilters({
  proveedores,
  empresas,
  buscar = "",
  proveedor = "",
  empresa = "",
  estado = "",
}: Props) {
  return (
    <form method="GET" className="rounded-xl bg-white p-5 shadow">
      <div className="grid gap-4 md:grid-cols-6">
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium">Buscar</label>
          <input type="text" name="buscar" defaultValue={buscar} placeholder="Número o proveedor..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Estado</label>
          <select name="estado" defaultValue={estado} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="parcial">Parcial</option>
            <option value="pagada">Pagada</option>
            <option value="vencida">Vencida</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Proveedor</label>
          <select name="proveedor" defaultValue={proveedor} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="">Todos</option>
            {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre_fantasia}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Empresa</label>
          <select name="empresa" defaultValue={empresa} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="">Todas</option>
            {empresas.map((e) => <option key={e.id} value={e.id}>{e.razon_social}</option>)}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" className="flex-1 rounded-lg bg-black px-4 py-2 text-white hover:bg-gray-800">Buscar</button>
          <Link href="/remitos" className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100">Limpiar</Link>
        </div>
      </div>
    </form>
  );
}
