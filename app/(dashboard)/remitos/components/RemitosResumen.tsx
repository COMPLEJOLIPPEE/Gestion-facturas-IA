type Props = {
  totalComprobantes: number;
  totalComprado: number;
  totalPagado: number;
  totalPendiente: number;
  pendientes: number;
  parciales: number;
  pagados: number;
  vencidos: number;
};

export default function RemitosResumen({
  totalComprobantes,
  totalComprado,
  totalPagado,
  totalPendiente,
  pendientes,
  parciales,
  pagados,
  vencidos,
}: Props) {
  const moneda = (valor: number) => `$${valor.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`

  const cards = [
    { titulo: "Total comprobantes", valor: totalComprobantes, color: "bg-blue-50 text-blue-700", icono: "📄" },
    { titulo: "Total comprado", valor: moneda(totalComprado), color: "bg-purple-50 text-purple-700", icono: "🛒" },
    { titulo: "Total pagado", valor: moneda(totalPagado), color: "bg-green-50 text-green-700", icono: "🟢" },
    { titulo: "Pagados", valor: pagados, color: "bg-green-50 text-green-700", icono: "🟢" },
    { titulo: "Parciales", valor: parciales, color: "bg-yellow-50 text-yellow-700", icono: "🟡" },
    { titulo: "Pendientes", valor: pendientes, color: "bg-gray-100 text-gray-700", icono: "⚪" },
    { titulo: "Vencidos", valor: vencidos, color: "bg-red-50 text-red-700", icono: "🔴" },
    { titulo: "Monto pendiente", valor: moneda(totalPendiente), color: "bg-indigo-50 text-indigo-700", icono: "💰" },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.titulo} className={`rounded-xl p-4 shadow ${card.color}`}>
          <p className="text-sm font-medium">{card.icono} {card.titulo}</p>
          <p className="mt-2 text-2xl font-bold">{card.valor}</p>
        </div>
      ))}
    </div>
  )
}
