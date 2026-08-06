import Link from "next/link";
import { FileText, Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { DataTable, Column } from "@/components/DataTable";
import { formatDateAR } from "@/lib/utils";

import RemitosFilters from "./components/RemitosFilters";
import RemitosResumen from "./components/RemitosResumen";

type Remito = {
  id: string;
  numero: string | null;
  fecha: string;
  monto_total: number;

  proveedor_id: string | null;
  empresa_id: string | null;

  proveedores: {
    nombre_fantasia: string;
  } | null;
};

const columns: Column<Remito>[] = [
  {
    key: "numero",
    label: "Número",
  },

  {
    key: "proveedor",
    label: "Proveedor",
    render: (r) =>
      r.proveedores?.nombre_fantasia ?? "—",
  },

  {
    key: "fecha",
    label: "Fecha",
    render: (r) =>
      formatDateAR(r.fecha),
  },

  {
    key: "monto_total",
    label: "Total",
    align: "right",
    render: (r) =>
      `$${Number(r.monto_total).toLocaleString(
        "es-AR"
      )}`,
  },
];

export default async function RemitosPage({
  searchParams,
}: {
  searchParams: Promise<{
    buscar?: string;
    proveedor?: string;
    empresa?: string;
    estado?: string;
  }>;
}) {
  const supabase = await createClient();

  const {
    buscar = "",
    proveedor = "",
    empresa = "",
    estado = "",
  } = await searchParams;

  const [
    { data: proveedores },
    { data: empresas },
  ] = await Promise.all([
    supabase
      .from("proveedores")
      .select("id,nombre_fantasia")
      .order("nombre_fantasia"),

    supabase
      .from("empresas")
      .select("id,razon_social")
      .order("razon_social"),
  ]);

  let query = supabase
    .from("remitos")
    .select(`
      id,
      numero,
      fecha,
      monto_total,
      proveedor_id,
      empresa_id,

      proveedores (
        nombre_fantasia
      )
    `);
    if (buscar) {
  query = query.or(
    `numero.ilike.%${buscar}%`
  );
}

if (proveedor) {
  query = query.eq(
    "proveedor_id",
    proveedor
  );
}

if (empresa) {
  query = query.eq(
    "empresa_id",
    empresa
  );
}

const { data, error } =
  await query.order("fecha", {
    ascending: false,
  });

if (error) {
  return (
    <div className="rounded-xl bg-red-50 p-4 text-red-700">
      Error cargando remitos: {error.message}
    </div>
  );
}

const remitos: Remito[] =
  (data ?? []).map((remito) => ({
    ...remito,

    proveedores: Array.isArray(
      remito.proveedores
    )
      ? remito.proveedores[0] ?? null
      : remito.proveedores,
  }));

const { data: pagos } = await supabase
  .from("pagos")
  .select(`
    remito_id,
    monto
  `);

const pagosPorRemito = new Map<
  string,
  number
>();

(pagos ?? []).forEach((pago) => {

  if (!pago.remito_id) return;

  const acumulado =
    pagosPorRemito.get(
      pago.remito_id
    ) ?? 0;

  pagosPorRemito.set(
    pago.remito_id,
    acumulado +
      Number(pago.monto ?? 0)
  );

});

const totalComprobantes =
  remitos.length;

const totalComprado =
  remitos.reduce(
    (acc, remito) =>
      acc +
      Number(remito.monto_total ?? 0),
    0
  );

let totalPagado = 0;
let totalPendiente = 0;

let pendientes = 0;
let parciales = 0;
let pagados = 0;

remitos.forEach((remito) => {

  const pagado =
    pagosPorRemito.get(
      remito.id
    ) ?? 0;

  totalPagado += pagado;

  const saldo =
    Number(remito.monto_total) -
    pagado;

  totalPendiente += Math.max(
    saldo,
    0
  );

  if (pagado <= 0) {

    pendientes++;

  } else if (
    pagado <
    Number(remito.monto_total)
  ) {

    parciales++;

  } else {

    pagados++;

  }

});
return (
  <div className="space-y-6">

    <div className="flex items-center justify-between">

      <div>

        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <FileText className="h-8 w-8" />
          Remitos
        </h1>

        <p className="mt-1 text-gray-600">
          Gestión de compras sin factura fiscal.
        </p>

      </div>

      <Link
        href="/remitos/nuevo"
        className="inline-flex items-center rounded-lg bg-black px-4 py-2 text-white hover:bg-gray-800"
      >
        <Plus className="mr-2 h-4 w-4" />
        Nuevo remito
      </Link>

    </div>

    <RemitosFilters
      proveedores={proveedores ?? []}
      empresas={empresas ?? []}
      buscar={buscar}
      proveedor={proveedor}
      empresa={empresa}
      estado={estado}
    />

    <RemitosResumen
      totalComprobantes={totalComprobantes}
      totalComprado={totalComprado}
      totalPagado={totalPagado}
      totalPendiente={totalPendiente}
      pendientes={pendientes}
      parciales={parciales}
      pagados={pagados}
    />

    <DataTable
      columns={columns}
      data={remitos}
      onView={(remito) =>
        `/remitos/${remito.id}`
      }
    />

  </div>
);
}
