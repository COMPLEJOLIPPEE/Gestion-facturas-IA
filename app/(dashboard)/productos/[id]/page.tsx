import { Badge } from "@/components/ui";
import PageContainer from "@/components/layout/PageContainer";
import PageHeader from "@/components/layout/PageHeader";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

const money = (value: number) =>
  `$${Number(value ?? 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function ProductoDetalle({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: producto, error } = await supabase
    .from("productos")
    .select("*, categorias_productos (nombre)")
    .eq("id", id)
    .single();

  if (error || !producto) {
    return <PageContainer><div className="rounded-xl bg-red-50 p-4 text-red-700">Producto no encontrado.</div></PageContainer>;
  }

  const { data: compras } = await supabase
    .from("factura_items")
    .select(`
      id,
      cantidad,
      precio_neto_unitario,
      precio_unitario,
      factura_id,
      facturas (fecha, numero, proveedores (nombre_fantasia, razon_social))
    `)
    .eq("producto_id", id)
    .order("factura_id", { ascending: false });

  const historial = (compras ?? [])
    .filter((item) => item.precio_neto_unitario != null || item.precio_unitario != null)
    .map((item) => {
      const factura = Array.isArray(item.facturas) ? item.facturas[0] : item.facturas;
      const proveedor = factura && (Array.isArray(factura.proveedores) ? factura.proveedores[0] : factura.proveedores);
      return {
        id: item.id,
        fecha: factura?.fecha ?? null,
        numero: factura?.numero ?? "—",
        proveedor: proveedor?.nombre_fantasia || proveedor?.razon_social || "—",
        precio: Number(item.precio_neto_unitario ?? item.precio_unitario ?? 0),
      };
    })
    .sort((a, b) => String(b.fecha ?? "").localeCompare(String(a.fecha ?? "")));

  const historialConVariacion = historial.map((item, index) => {
    const anterior = historial[index + 1]?.precio;
    const variacion = anterior && anterior !== 0 ? ((item.precio - anterior) / anterior) * 100 : null;
    return { ...item, anterior, variacion };
  });

  const ultimaCompra = historialConVariacion[0] ?? null;

  return (
    <PageContainer>
      <PageHeader title={producto.nombre} description={`Código: ${producto.codigo ?? "—"}`} />

      <div className="grid grid-cols-1 gap-4 rounded-xl bg-white p-6 shadow md:grid-cols-3">
        <div><span className="text-gray-500">Categoría</span><p className="mt-1 font-medium">{producto.categorias_productos?.nombre ?? "Sin categoría"}</p></div>
        <div><span className="text-gray-500">Unidad de medida</span><p className="mt-1 font-medium">{producto.unidad_medida || "—"}</p></div>
        <div><span className="text-gray-500">Estado</span><div className="mt-1"><Badge variant={producto.activo ? "success" : "danger"}>{producto.activo ? "Activo" : "Inactivo"}</Badge></div></div>
        <div><span className="text-gray-500">Costo actual</span><p className="mt-1 font-medium">{money(producto.costo_actual)}</p></div>
        <div><span className="text-gray-500">Último costo</span><p className="mt-1 font-medium">{money(producto.ultimo_costo)}</p></div>
        <div><span className="text-gray-500">Precio de venta</span><p className="mt-1 font-medium">{money(producto.precio_venta)}</p></div>
      </div>

      <section className="mt-6 rounded-xl bg-white p-6 shadow">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Historial de compras y costos</h2>
          <p className="mt-1 text-sm text-gray-500">Se alimenta automáticamente con las facturas donde aparece este producto.</p>
        </div>

        {ultimaCompra && (
          <div className="mb-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div><span className="text-xs text-gray-500">Última compra</span><p className="font-semibold">{ultimaCompra.fecha ? new Date(`${ultimaCompra.fecha}T12:00:00`).toLocaleDateString("es-AR") : "—"}</p></div>
              <div><span className="text-xs text-gray-500">Proveedor</span><p className="font-semibold">{ultimaCompra.proveedor}</p></div>
              <div><span className="text-xs text-gray-500">Precio neto unitario</span><p className="font-semibold">{money(ultimaCompra.precio)}</p></div>
            </div>
          </div>
        )}

        {historialConVariacion.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">Todavía no hay compras registradas para este producto.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b bg-gray-50"><tr><th className="p-3 text-left">Fecha</th><th className="p-3 text-left">Factura</th><th className="p-3 text-left">Proveedor</th><th className="p-3 text-right">Precio</th><th className="p-3 text-right">Anterior</th><th className="p-3 text-right">Variación</th></tr></thead>
              <tbody>
                {historialConVariacion.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="p-3">{item.fecha ? new Date(`${item.fecha}T12:00:00`).toLocaleDateString("es-AR") : "—"}</td>
                    <td className="p-3">{item.numero}</td>
                    <td className="p-3">{item.proveedor}</td>
                    <td className="p-3 text-right font-medium">{money(item.precio)}</td>
                    <td className="p-3 text-right">{item.anterior != null ? money(item.anterior) : "—"}</td>
                    <td className={`p-3 text-right font-semibold ${item.variacion == null ? "text-gray-400" : item.variacion > 0 ? "text-red-600" : item.variacion < 0 ? "text-green-600" : "text-gray-500"}`}>{item.variacion == null ? "—" : `${item.variacion > 0 ? "+" : ""}${item.variacion.toFixed(2)}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PageContainer>
  );
}