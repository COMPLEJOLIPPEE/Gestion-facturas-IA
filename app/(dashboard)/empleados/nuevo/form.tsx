"use client";
import { Input } from "@/components/ui";
import SubmitButton from "@/app/(dashboard)/proveedores/nuevo/submitbutton";
export default function EmpleadoForm({action}:{action:(formData:FormData)=>void}) {
  return <form action={action} className="grid max-w-2xl gap-5 rounded-xl bg-white p-6 shadow">
    <div className="grid gap-4 sm:grid-cols-2">
      <div><label className="mb-1 block text-sm font-medium text-gray-700">Nombre *</label><Input name="nombre" required placeholder="Nombre"/></div>
      <div><label className="mb-1 block text-sm font-medium text-gray-700">Apellido *</label><Input name="apellido" required placeholder="Apellido"/></div>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div><label className="mb-1 block text-sm font-medium text-gray-700">Documento</label><Input name="documento" placeholder="DNI"/></div>
      <div><label className="mb-1 block text-sm font-medium text-gray-700">Teléfono</label><Input name="telefono" placeholder="Teléfono"/></div>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div><label className="mb-1 block text-sm font-medium text-gray-700">Email</label><Input type="email" name="email" placeholder="email@ejemplo.com"/></div>
      <div><label className="mb-1 block text-sm font-medium text-gray-700">Fecha de ingreso</label><Input type="date" name="fecha_ingreso"/></div>
    </div>
    <div><label className="mb-1 block text-sm font-medium text-gray-700">Periodicidad de pago</label>
      <select name="periodicidad_pago" defaultValue="" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
        <option value="">Sin definir</option><option value="semanal">Semanal</option><option value="quincenal">Quincenal</option><option value="mensual">Mensual</option>
      </select>
    </div>
    <div><label className="mb-1 block text-sm font-medium text-gray-700">Observaciones</label>
      <textarea name="observaciones" rows={4} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Notas internas sobre el empleado..."/>
    </div>
    <SubmitButton>Guardar empleado</SubmitButton>
  </form>;
}
