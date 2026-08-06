import Link from "next/link";
import { FileText, Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { DataTable, Column } from "@/components/DataTable";
import { formatDateAR } from "@/lib/utils";

import EstadoBadge from "./components/EstadoBadge";
import FacturasFilters from "./components/FacturasFilters";
import FacturasResumen from "./components/FacturasResumen";
import { calcularEstadoFactura } from "./utils/FacturaEstado";

type Factura = {
  id: string;
  numero: string | null;
  fecha: string;
  fecha_vencimiento: string |null;
  total: number;

  proveedor_id: string | null;
  empresa_id: string | null;

  proveedores: {
    nombre_fantasia: string;
  } | null;

  pagos: {
    monto: number;
  }[];
};

const columns: Column<Factura>[] = [
  {
    key: "numero",
    label: "Número",
  },

  {
    key: "proveedor",
    label: "Proveedor",
    render: (factura) =>
      factura.proveedores?.nombre_fantasia ?? "—",
  },

  {
    key: "fecha",
    label: "Fecha",
    render: (factura) =>
      formatDateAR(factura.fecha),
  },

  {
    key: "fecha_vencimiento",
    label: "Vencimiento",
    render: (factura) =>
      formatDateAR(
        factura.fecha_vencimiento
      ),
  },

  {
    key: "total",
    label: "Total",
    align: "right",
    render: (factura) =>
      `$${factura.total.toLocaleString(
        "es-AR"
      )}`,
  },

  {
    key: "estado",
    label: "Estado",
    align: "center",

    render: (factura) => {

      const pagado =
        factura.pagos.reduce(
          (acumulado, pago) =>
            acumulado + pago.monto,
          0
        );

      const estado =
        calcularEstadoFactura({
          total: factura.total,
          pagado,
          fechaVencimiento:
            factura.fecha_vencimiento,
        });

      return (
        <EstadoBadge
          estado={estado}
        />
      );
    },
  },
];
export default async function FacturasPage({
  searchParams,
}: {
  searchParams: Promise<{
    buscar?: string;
    proveedor?: string;
    empresa?: string;
    estado?: string;
  }>;
}) {
  const params = await searchParams;

  const buscar = params.buscar ?? "";
  const proveedorFiltro = params.proveedor ?? "";
  const empresaFiltro = params.empresa ?? "";
  const estadoFiltro = params.estado ?? "";

  const supabase = await createClient();

  const [{ data: proveedores }, { data: empresas }] =
    await Promise.all([
      supabase
        .from("proveedores")
        .select("id, nombre_fantasia")
        .order("nombre_fantasia"),

      supabase
        .from("empresas")
        .select("id, razon_social")
        .order("razon_social"),
    ]);

  let query = supabase
    .from("facturas")
    .select(`
      id,
      numero,
      fecha,
      fecha_vencimiento,
      total,

      proveedor_id,
      empresa_id,

      proveedores (
        nombre_fantasia
      ),

      pagos (
        monto
      )
    `);

  if (buscar) {
    query = query.or(
      `numero.ilike.%${buscar}%`
    );
  }

  if (proveedorFiltro) {
    query = query.eq(
      "proveedor_id",
      proveedorFiltro
    );
  }

  if (empresaFiltro) {
    query = query.eq(
      "empresa_id",
      empresaFiltro
    );
  }

  const {
    data,
    error,
  } = await query.order(
    "fecha",
    {
      ascending: false,
    }
  );

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-4 text-red-700">
        Error cargando facturas: {error.message}
      </div>
    );
  }

  const facturas: Factura[] =
    (data ?? []).map((factura) => ({
      ...factura,

      proveedores: Array.isArray(
        factura.proveedores
      )
        ? factura.proveedores[0] ?? null
        : factura.proveedores,

      pagos: Array.isArray(
        factura.pagos
      )
        ? factura.pagos
        : [],
    }));

  const resumen = facturas.reduce(
    (acc, factura) => {
      const pagado = factura.pagos.reduce(
        (total, pago) => total + pago.monto,
        0
      );

      const estado = calcularEstadoFactura({
        total: factura.total,
        pagado,
        fechaVencimiento: factura.fecha_vencimiento,
      });

      acc.totalFacturas++;

      switch (estado) {
        case "pagada":
          acc.pagadas++;
          break;

        case "parcial":
          acc.parciales++;
          acc.montoPendiente +=
            factura.total - pagado;
          break;

        case "pendiente":
          acc.pendientes++;
          acc.montoPendiente +=
            factura.total;
          break;

        case "vencida":
          acc.vencidas++;
          acc.montoPendiente +=
            factura.total;
          break;
      }

      return acc;
    },
    {
      totalFacturas: 0,
      pagadas: 0,
      parciales: 0,
      pendientes: 0,
      vencidas: 0,
      montoPendiente: 0,
    }
  );

  const facturasFiltradas = facturas.filter(
    (factura) => {
      if (!estadoFiltro) {
        return true;
      }

      const pagado = factura.pagos.reduce(
        (total, pago) => total + pago.monto,
        0
      );

      const estado = calcularEstadoFactura({
        total: factura.total,
        pagado,
        fechaVencimiento:
          factura.fecha_vencimiento,
      });

      return estado === estadoFiltro;
    }
  );

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">

        <div>

          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <FileText className="h-8 w-8" />
            Facturas
          </h1>

          <p className="mt-1 text-gray-600">
            Gestión y seguimiento de facturas de compra.
          </p>

        </div>

        <Link
          href="/facturas/nuevo"
          className="inline-flex items-center rounded-lg bg-black px-4 py-2 text-white hover:bg-gray-800"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva factura
        </Link>

      </div>

      <FacturasFilters
        proveedores={proveedores ?? []}
        empresas={empresas ?? []}
        buscar={buscar}
        proveedor={proveedorFiltro}
        empresa={empresaFiltro}
        estado={estadoFiltro}
      />
      <FacturasResumen
       totalFacturas={resumen.totalFacturas}
      pagadas={resumen.pagadas}
      parciales={resumen.parciales}
      pendientes={resumen.pendientes}
      vencidas={resumen.vencidas}
      montoPendiente={resumen.montoPendiente}
      />
      <DataTable
        columns={columns}
        data={facturasFiltradas}
        onView={(factura) =>
          `/facturas/${factura.id}`
        }
      />

    </div>
  );
}