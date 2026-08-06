type Props = {
  estado: string | null;
};

export default function EstadoBadge({
  estado,
}: Props) {
  const valor = (estado ?? "").toLowerCase();

  switch (valor) {
    case "pagada":
      return (
        <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
          🟢 Pagada
        </span>
      );

    case "parcial":
      return (
        <span className="inline-flex rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
          🟡 Parcial
        </span>
      );

    case "vencida":
      return (
        <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
          🔴 Vencida
        </span>
      );

    default:
      return (
        <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
          ⚪ Pendiente
        </span>
      );
  }
}