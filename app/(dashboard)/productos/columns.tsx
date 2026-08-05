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
    render: (p) =>
      p.categorias_productos?.nombre ? (
        <Badge variant="secondary">
          {p.categorias_productos.nombre}
        </Badge>
      ) : (
        <Badge variant={"outline" as any}>
          Sin categoría
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