export type EstadoFactura =
  | "pendiente"
  | "parcial"
  | "pagada"
  | "vencida";

type Params = {
  total: number;
  pagado: number;
  fechaVencimiento?: string | null;
};

export function calcularEstadoFactura({
  total,
  pagado,
  fechaVencimiento,
}: Params): EstadoFactura {
  if (total <= 0) {
    return "pendiente";
  }

  if (pagado >= total) {
    return "pagada";
  }

  if (pagado > 0) {
    return "parcial";
  }

  if (fechaVencimiento) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const vencimiento = new Date(fechaVencimiento);
    vencimiento.setHours(0, 0, 0, 0);

    if (vencimiento < hoy) {
      return "vencida";
    }
  }

  return "pendiente";
}