type Props = {
  totalFacturas: number;
  pagadas: number;
  parciales: number;
  pendientes: number;
  vencidas: number;
  montoPendiente: number;
};

export default function FacturasResumen({
  totalFacturas,
  pagadas,
  parciales,
  pendientes,
  vencidas,
  montoPendiente,
}: Props) {
  const cards = [
    {
      titulo: "Total facturas",
      valor: totalFacturas,
      color: "bg-blue-50 text-blue-700",
      icono: "📄",
    },
    {
      titulo: "Pagadas",
      valor: pagadas,
      color: "bg-green-50 text-green-700",
      icono: "🟢",
    },
    {
      titulo: "Parciales",
      valor: parciales,
      color: "bg-yellow-50 text-yellow-700",
      icono: "🟡",
    },
    {
      titulo: "Pendientes",
      valor: pendientes,
      color: "bg-gray-100 text-gray-700",
      icono: "⚪",
    },
    {
      titulo: "Vencidas",
      valor: vencidas,
      color: "bg-red-50 text-red-700",
      icono: "🔴",
    },
    {
      titulo: "Monto pendiente",
      valor: `$${montoPendiente.toLocaleString("es-AR")}`,
      color: "bg-indigo-50 text-indigo-700",
      icono: "💰",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      {cards.map((card) => (
        <div
          key={card.titulo}
          className={`rounded-xl p-4 shadow ${card.color}`}
        >
          <p className="text-sm font-medium">
            {card.icono} {card.titulo}
          </p>

          <p className="mt-2 text-2xl font-bold">
            {card.valor}
          </p>
        </div>
      ))}
    </div>
  );
}