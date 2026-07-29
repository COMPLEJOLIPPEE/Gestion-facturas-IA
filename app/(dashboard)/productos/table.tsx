import { DataTable } from "@/components/DataTable";
import { columns, Producto } from "./columns";

type Props = {
  productos: Producto[];
};

export default function ProductosTable({
  productos,
}: Props) {
  return (
    <DataTable
      columns={columns}
      data={productos}
      onView={(p) => `/productos/${p.id}`}
      onEdit={(p) => `/productos/${p.id}/editar`}
    />
  );
}