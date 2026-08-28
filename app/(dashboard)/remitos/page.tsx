import Link from "next/link";
import { FileText, Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { DataTable, Column } from "@/components/DataTable";
import { formatDateAR } from "@/lib/utils";
import { canWrite, getCurrentRole } from "@/lib/auth/permissions";

import EstadoBadge from "../facturas/components/EstadoBadge";
import RemitosFilters from "./components/RemitosFilters";
import RemitosResumen from "./components/RemitosResumen";
import { calcularEstadoFactura } from "../facturas/utils/FacturaEstado";

type Remito = {
  id: string;
  numero: string | null;
  fecha: string;
  fecha_vencimiento: string | null;
  monto_total: number;
  proveedor_id: string | null;
  empresa_id: string | null;
  proveedores: { nombre_fantasia: string } | null;
  pagos: { monto: number }[];
};

const columns: Column<Remito>[] = [
  { key: "numero", label: "Número" },
  { key: "proveedor", label: "Proveedor", render: (r) => r.proveedores?.nombre_fantasia ?? "—" },
  { key: "fecha", label: "Fecha", render: (r) => formatDateAR(r.fecha) },
  { key: "fecha_vencimiento", label: "Vencimiento", render: (r) => formatDateAR(r.fecha_vencimiento) },
  { key: "monto_total", label: "Total", align: "right", render: (r) => `$${Number(r.monto_total).toLocaleString("es-AR")}` },
  {
    key: "estado",
    label: "Estado",
    align: "center",
    render: (r) => {
      const pagado = r.pagos.reduce((acumulado, pago) => acumulado + Number(pago.monto ?? 0), 0);
      return <EstadoBadge estado={calcularEstadoFactura({ total: Number(r.monto_total), pagado, fechaVencimiento: r.fecha_vencimiento })} />;
    },
  },
];

export default async function RemitosPage({
  searchParams,
}: {
  searchParams: Promise<{ buscar?: string; proveedor?: string; empresa?: string; estado?: string }>;
}) {
  const supabase = await createClient();
  const role = await getCurrentRole();
  const writable = canWrite(role);

  const params = await searchParams;
  const buscar = params.buscar ?? "";
  const proveedorFiltro = params.proveedor ?? "";
  const empresaFiltro = params.empresa ?? "";
  const estadoFiltro = params.estado ?? "";

  const [{ data: proveedores }, { data: empresas }] = await Promise.all([
    supabase.from("proveedores").select("id,nombre_fantasia").order("nombre_fantasia"),
    supabase.from("empresas").select("id,razon_social").order("razon_social"),
  ]);

  let query = supabase.from("remitos").select(`
    id, numero, fecha, fecha_vencimiento, monto_total, proveedor_id, empresa_id,
    proveedores (nombre_fantasia), pagos (monto)
  `);

  if (buscar) query = query.or(`numero.ilike.%${buscar}%`);
  if (proveedorFiltro) query = query.eq("proveedor_id", proveedorFiltro);
  if (empresaFiltro) query = query.eq("empresa_id", empresaFiltro);

  const { data, error } = await query.order("fecha", { ascending: false });
  if (error) return <div className="rounded-xl bg-red-50 p-4 text-red-700">Error cargando remitos: {error.message}</div>;

  const remitos: Remito[] = (data ?? []).map((remito) => ({
    ...remito,
    proveedores: Array.isArray(remito.proveedores) ? remito.proveedores[0] ?? null : remito.proveedores,
    pagos: Array.isArray(remito.pagos) ? remito.pagos : [],
  }));

  const remitosConEstado = remitos.map((remito) => {
    const pagado = remito.pagos.reduce((total, pago) => total + Number(pago.monto ?? 0), 0);
    const estado = calcularEstadoFactura({ total: Number(remito.monto_total), pagado, fechaVencimiento: remito.fecha_vencimiento });
    return { remito, pagado, estado };
  });

  const remitosFiltrados = remitosConEstado
    .filter(({ estado }) => !estadoFiltro || estado === estadoFiltro)
    .map(({ remito }) => remito);

  const resumen = remitosConEstado.reduce(
    (acc, { remito, pagado, estado }) => {
      acc.totalComprobantes++;
      acc.totalComprado += Number(remito.monto_total ?? 0);
      acc.totalPagado += pagado;
      switch (estado) {
        case "pagada": acc.pagados++; break;
        case "parcial":
          acc.parciales++;
          acc.totalPendiente += Math.max(Number(remito.monto_total ?? 0) - pagado, 0);
          break;
        case "vencida":
          acc.vencidos++;
          acc.totalPendiente += Number(remito.monto_total ?? 0);
          break;
        default:
          acc.pendientes++;
          acc.totalPendiente += Number(remito.monto_total ?? 0);
      }
      return acc;
    },
    { totalComprobantes: 0, totalComprado: 0, totalPagado: 0, totalPendiente: 0, pendientes: 0, parciales: 0, pagados: 0, vencidos: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold"><FileText className="h-8 w-8" />Remitos</h1>
          <p className="mt-1 text-gray-600">Gestión de compras sin factura fiscal.</p>
        </div>
        {writable && (
          <Link href="/remitos/nuevo" className="inline-flex items-center rounded-lg bg-black px-4 py-2 text-white hover:bg-gray-800">
            <Plus className="mr-2 h-4 w-4" />Nuevo remito
          </Link>
        )}
      </div>

      <RemitosFilters proveedores={proveedores ?? []} empresas={empresas ?? []} buscar={buscar} proveedor={proveedorFiltro} empresa={empresaFiltro} estado={estadoFiltro} />
      <RemitosResumen totalComprobantes={resumen.totalComprobantes} totalComprado={resumen.totalComprado} totalPagado={resumen.totalPagado} totalPendiente={resumen.totalPendiente} pendientes={resumen.pendientes} parciales={resumen.parciales} pagados={resumen.pagados} vencidos={resumen.vencidos} />
      <DataTable columns={columns} data={remitosFiltrados} onView={(remito) => `/remitos/${remito.id}`} />
    </div>
  );
}
