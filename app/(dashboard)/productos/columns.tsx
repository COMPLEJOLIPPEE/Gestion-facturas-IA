import { Badge } from "@/components/ui";
import { Column } from "@/components/DataTable";

export type Producto = {
  id: string;
  codigo: string;
  nombre: string;
  unidad_medida: string;
  costo_actual: number;
  ultimo_costo: number;
  precio_venta: number;
  activo: boolean;
  categorias_productos: {
    nombre: string;
  } | null;
};

const money = (value: number) =>
  `$${Number(value ?? 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const columns: Column<Producto>[] = [
  { key: "codigo", label: "Código", render: (p) => p.codigo?.trim() ? p.codigo : <span className="text-gray-400">—</span> },
  { key: "nombre", label: "Producto" },
  { key: "categoria", label: "Categoría", render: (p) => <Badge variant="secondary">{p.categorias_productos?.nombre ?? "Sin categoría"}</Badge> },
  { key: "unidad_medida", label: "Unidad", render: (p) => p.unidad_medida || <span className="text-gray-400">—</span> },
  { key: "costo_actual", label: "Costo actual", align: "right", render: (p) => money(p.costo_actual) },
  { key: "ultimo_costo", label: "Último costo", align: "right", render: (p) => money(p.ultimo_costo) },
  { key: "activo", label: "Estado", align: "center", render: (p) => <Badge variant={p.activo ? "success" : "danger"}>{p.activo ? "Activo" : "Inactivo"}</Badge> },
];