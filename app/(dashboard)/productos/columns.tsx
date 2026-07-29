import { Badge } from "@/components/ui";
import { Column } from "@/components/DataTable";

export type Producto = {
  id: string;
  codigo: string;
  nombre: string;
  unidad_medida: string;
  costo_actual: number;
  precio_venta: number;
  iva: number;
  activo: boolean;
  categorias_productos: {
    nombre: string;
  } | null;
};

export const columns: Column<Producto>[] = [
  {
    key: "codigo",
    label: "Código",
  },
  {
    key: "nombre",
    label: "Producto",
  },
  {
    key: "categoria",
    label: "Categoría",
    render: (p) =>
      p.categorias_productos?.nombre ?? (
        <span className="text-gray-400 italic">
          Sin categoría
        </span>
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
      `$${Number(p.costo_actual ?? 0).toLocaleString("es-AR")}`,
  },
  {
    key: "precio_venta",
    label: "Venta",
    align: "right",
    render: (p) =>
      `$${Number(p.precio_venta ?? 0).toLocaleString("es-AR")}`,
  },
  {
    key: "iva",
    label: "IVA",
    align: "center",
    render: (p) => `${p.iva}%`,
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