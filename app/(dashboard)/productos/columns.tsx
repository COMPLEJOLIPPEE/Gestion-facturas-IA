import { Badge } from "@/components/ui";
import { Column } from "@/components/DataTable";

export type Producto = {
  id: string;
  codigo: string;
  nombre: string;
  unidad_medida: string;
  costo_actual: number;
  precio_venta: number;
  activo: boolean;
  categorias_productos: {
    nombre: string;
  } | null;
};

export const columns: Column<Producto>[] = [
  {
    key: "codigo",
    label: "Código",
    render: (p) =>
      p.codigo?.trim() ? (
        p.codigo
      ) : (
        <span className="text-gray-400">—</span>
      ),
  },
  {
    key: "nombre",
    label: "Producto",
  },
  {
    key: "categoria",
    label: "Categoría",
    render: (p) => (
      <Badge variant="secondary">
        {p.categorias_productos?.nombre ?? "Sin categoría"}
      </Badge>
    ),
  },
  {
    key: "unidad_medida",
    label: "Unidad",
  },
  {
    key: "costo_actual",
    label: "Costo",
    align: "right",
    render: (p) =>
      `$${Number(p.costo_actual).toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
  },
  {
    key: "precio_venta",
    label: "Venta",
    align: "right",
    render: (p) =>
      `$${Number(p.precio_venta).toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
  },
  {
    key: "activo",
    label: "Estado",
    align: "center",
    render: (p) => (
      <Badge variant={p.activo ? "success" : "danger"}>
        {p.activo ? "Activo" : "Inactivo"}
      </Badge>
    ),
  },
];