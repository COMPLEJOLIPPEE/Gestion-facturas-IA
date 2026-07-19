export type Column<T> = {
  key: string
  label: string
  align?: "left" | "right" | "center"
  render?: (row: T) => React.ReactNode
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  onView,
  onEdit,
}: {
  columns: Column<T>[]
  data: T[]
  onView?: (row: T) => string
  onEdit?: (row: T) => string
}) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow">
      <table className="w-full">
        <thead className="bg-gray-100">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={`p-3 text-${col.align ?? "left"}`}>
                {col.label}
              </th>
            ))}
            {(onView || onEdit) && <th className="p-3 text-center">Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id} className="border-t">
              {columns.map((col) => (
                <td key={col.key} className={`p-3 text-${col.align ?? "left"}`}>
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
                </td>
              ))}
              {(onView || onEdit) && (
                <td className="p-3">
                  <div className="flex justify-center gap-2">
                    {onView && (
                      <a href={onView(row)} className="rounded bg-gray-200 px-3 py-1 text-sm hover:bg-gray-300">
                        👁 Ver
                      </a>
                    )}
                    {onEdit && (
                      <a href={onEdit(row)} className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:opacity-80">
                        ✏️ Editar
                      </a>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}