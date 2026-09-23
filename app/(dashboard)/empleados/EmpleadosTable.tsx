"use client";
import Link from "next/link";
import { Search, Pencil, UserRound } from "lucide-react";

type Empleado = {
  id: string; nombre: string; apellido: string; documento: string | null;
  telefono: string | null; email: string | null; fecha_ingreso: string | null;
  activo: boolean; periodicidad_pago: string | null;
};
export default function EmpleadosTable({empleados,writable,search,estado}:{empleados:Empleado[];writable:boolean;search:string;estado:string}) {
  return <div className="space-y-4">
    <form method="get" className="flex flex-col gap-3 rounded-xl border bg-white p-4 md:flex-row">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input name="q" defaultValue={search} placeholder="Buscar por nombre, apellido o documento..."
          className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <select name="estado" defaultValue={estado} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
        <option value="">Todos los estados</option><option value="activo">Activos</option><option value="inactivo">Inactivos</option>
      </select>
      <button type="submit" className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">Filtrar</button>
    </form>
    <div className="overflow-hidden rounded-xl border bg-white"><div className="overflow-x-auto"><table className="min-w-full text-sm">
      <thead className="border-b bg-gray-50 text-left"><tr>
        <th className="px-4 py-3 font-semibold">Empleado</th><th className="px-4 py-3 font-semibold">Documento</th>
        <th className="px-4 py-3 font-semibold">Contacto</th><th className="px-4 py-3 font-semibold">Ingreso</th>
        <th className="px-4 py-3 font-semibold">Pago</th><th className="px-4 py-3 font-semibold">Estado</th>
        <th className="px-4 py-3 text-right font-semibold">Acciones</th>
      </tr></thead>
      <tbody className="divide-y">
        {empleados.map((e)=><tr key={e.id} className="hover:bg-gray-50">
          <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100"><UserRound className="h-4 w-4 text-gray-500"/></div><div><div className="font-medium text-gray-900">{e.apellido}, {e.nombre}</div>{e.email&&<div className="text-xs text-gray-500">{e.email}</div>}</div></div></td>
          <td className="px-4 py-3">{e.documento||"—"}</td><td className="px-4 py-3">{e.telefono||"—"}</td>
          <td className="px-4 py-3">{e.fecha_ingreso?new Date(`${e.fecha_ingreso}T00:00:00`).toLocaleDateString("es-AR"):"—"}</td>
          <td className="px-4 py-3 capitalize">{e.periodicidad_pago||"—"}</td>
          <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${e.activo?"bg-green-100 text-green-700":"bg-gray-100 text-gray-600"}`}>{e.activo?"Activo":"Inactivo"}</span></td>
          <td className="px-4 py-3 text-right"><Link href={`/empleados/${e.id}`} className="mr-3 text-sm font-medium text-blue-600 hover:text-blue-800">Ver</Link>
            {writable&&<Link href={`/empleados/${e.id}/editar`} className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900"><Pencil className="h-3.5 w-3.5"/>Editar</Link>}
          </td>
        </tr>)}
        {empleados.length===0&&<tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500">No se encontraron empleados con los filtros seleccionados.</td></tr>}
      </tbody>
    </table></div></div>
  </div>;
}
