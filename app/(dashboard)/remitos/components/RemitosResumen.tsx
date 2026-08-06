type Props = {
  totalComprobantes: number;
  totalComprado: number;
  totalPagado: number;
  totalPendiente: number;

  pendientes: number;
  parciales: number;
  pagados: number;
};

export default function RemitosResumen({
  totalComprobantes,
  totalComprado,
  totalPagado,
  totalPendiente,
  pendientes,
  parciales,
  pagados,
}: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">

      <div className="rounded-xl bg-white p-5 shadow">
        <p className="text-sm text-gray-500">
          Comprobantes
        </p>

        <p className="mt-2 text-2xl font-bold">
          {totalComprobantes}
        </p>
      </div>

      <div className="rounded-xl bg-white p-5 shadow">
        <p className="text-sm text-gray-500">
          Total comprado
        </p>

        <p className="mt-2 text-2xl font-bold">
          ${totalComprado.toLocaleString("es-AR")}
        </p>
      </div>

      <div className="rounded-xl bg-white p-5 shadow">
        <p className="text-sm text-gray-500">
          Total pagado
        </p>

        <p className="mt-2 text-2xl font-bold text-green-700">
          ${totalPagado.toLocaleString("es-AR")}
        </p>
      </div>

      <div className="rounded-xl bg-white p-5 shadow">
        <p className="text-sm text-gray-500">
          Saldo pendiente
        </p>

        <p className="mt-2 text-2xl font-bold text-amber-700">
          ${totalPendiente.toLocaleString("es-AR")}
        </p>
      </div>

      <div className="rounded-xl bg-white p-5 shadow">
        <p className="text-sm text-gray-500">
          Pendientes
        </p>

        <p className="mt-2 text-2xl font-bold">
          {pendientes}
        </p>
      </div>

      <div className="rounded-xl bg-white p-5 shadow">
        <p className="text-sm text-gray-500">
          Pagados / Parciales
        </p>

        <p className="mt-2 text-2xl font-bold">
          {pagados} / {parciales}
        </p>
      </div>

    </div>
  );
}