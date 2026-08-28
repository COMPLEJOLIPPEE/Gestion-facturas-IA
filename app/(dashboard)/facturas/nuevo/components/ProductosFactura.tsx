"use client";

type Producto = { id: string; nombre: string; codigo: string | null; marca?: string | null; categoria?: string | null };
export type LineaFactura = {
  producto_id: string; cantidad: number; precio_unitario: number; iva: number; descuento: number; precio_final: number;
  bonificacion?: number; cantidad_bonificada?: number; cantidad_bonificada_detalle?: number; tipo_bonificacion?: "cantidad" | "importe" | "porcentaje";
  precio_bruto_unitario?: number; precio_neto?: number; subtotal_neto?: number; impuestos_internos?: number; iva_importe?: number;
  codigo_proveedor?: string; descripcion_proveedor?: string; descripcionLeida?: string; autoMatcheado?: boolean; score?: number;
  confianza?: "alta" | "media" | "baja"; motivo?: string; aprendido?: boolean; fuente?: "alias" | "smartmatch" | "manual";
  producto_sugerido_id?: string; producto_sugerido_nombre?: string; tipo_linea?: "producto" | "ajuste"; es_ajuste_negativo?: boolean;
};

type Props = {
  productos: Producto[]; lineas: LineaFactura[]; agregarLinea: () => void; quitarLinea: (index: number) => void;
  actualizarLinea: (index: number, campo: keyof LineaFactura, valor: string | number | boolean) => void;
  actualizarProductoDeLinea: (index: number, productoId: string) => void;
  crearProductoDesdeLinea: (index: number, nombre: string, costo: number, iva: number) => Promise<void>;
};
function dinero(valor: number) { return valor.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function ProductosFactura({ productos, lineas, agregarLinea, quitarLinea, actualizarLinea, actualizarProductoDeLinea, crearProductoDesdeLinea }: Props) {
  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <div className="mb-6 flex items-center justify-between"><div><h2 className="text-xl font-semibold">Productos</h2><p className="mt-1 text-sm text-gray-500">Revise los productos detectados por IA o agregue nuevos manualmente.</p></div><button type="button" onClick={agregarLinea} className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:opacity-90">+ Agregar producto</button></div>
      {lineas.length === 0 && <div className="rounded-lg border border-dashed p-10 text-center text-gray-500">Todavía no hay productos cargados.</div>}
      {lineas.length > 0 && <div className="overflow-x-auto"><div className="min-w-[1180px]">
        <div className="mb-3 grid grid-cols-[minmax(300px,3fr)_80px_120px_90px_90px_120px_70px_110px_110px_120px_40px] gap-3 border-b pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500"><div>Línea / Producto</div><div className="text-center">Cant.</div><div className="text-right">P. Unit.</div><div className="text-right">Dto.</div><div className="text-right">Bonif.</div><div className="text-right">P. Neto Unit.</div><div className="text-center">IVA %</div><div className="text-right">IVA $</div><div className="text-right">Imp. Int.</div><div className="text-right">Total línea</div><div></div></div>
        {lineas.map((linea, index) => {
          const esAjuste = linea.tipo_linea === "ajuste" || linea.es_ajuste_negativo === true;
          const cantidad = Number(linea.cantidad ?? 0); const precioUnitario = Number(linea.precio_unitario ?? 0); const precioBrutoUnitario = Number(linea.precio_bruto_unitario ?? precioUnitario); const bruto = cantidad * precioBrutoUnitario;
          const descuento = esAjuste ? 0 : Math.abs(Number(linea.descuento ?? 0)); const bonificacion = esAjuste ? 0 : Math.abs(Number(linea.bonificacion ?? 0));
          const cantidadBonificada = Math.min(Math.max(0, Number(linea.cantidad_bonificada ?? linea.cantidad_bonificada_detalle ?? 0)), cantidad);
          const bonificacionCantidad = esAjuste || linea.tipo_bonificacion !== "cantidad" ? 0 : cantidadBonificada * Math.abs(precioBrutoUnitario); const totalBonificacion = bonificacion + bonificacionCantidad;
          const subtotalNeto = linea.subtotal_neto != null ? Number(linea.subtotal_neto) : (esAjuste ? bruto : Math.max(0, bruto - descuento - totalBonificacion));
          const precioNeto = linea.precio_neto != null ? Number(linea.precio_neto) : (cantidad > 0 ? subtotalNeto / cantidad : precioBrutoUnitario);
          const ivaImporte = linea.iva_importe != null ? Number(linea.iva_importe) : subtotalNeto * (Number(linea.iva ?? 0) / 100); const impuestosInternos = Number(linea.impuestos_internos ?? 0); const totalLinea = subtotalNeto + ivaImporte + impuestosInternos;
          return <div key={index} className="mb-4 grid grid-cols-[minmax(300px,3fr)_80px_120px_90px_90px_120px_70px_110px_110px_120px_40px] items-start gap-3">
            <div>{esAjuste ? <div className="rounded-lg border border-red-200 bg-red-50 p-3"><div className="mb-2 flex items-center justify-between"><span className="rounded-full bg-red-600 px-2 py-1 text-[11px] font-bold text-white">AJUSTE NEGATIVO</span><button type="button" onClick={() => { actualizarLinea(index, "tipo_linea", "producto"); actualizarLinea(index, "es_ajuste_negativo", false); actualizarLinea(index, "precio_unitario", Math.abs(Number(linea.precio_unitario ?? 0))) }} className="text-xs font-medium text-red-700 hover:underline">Convertir en producto</button></div><p className="text-sm font-semibold text-red-900">{linea.descripcionLeida || "Ajuste del comprobante"}</p><p className="mt-1 text-xs text-red-700">No requiere seleccionar un producto. El importe y su IVA restan de los totales.</p></div> : <>
              <select value={linea.producto_id} required onChange={(e) => actualizarProductoDeLinea(index, e.target.value)} className="w-full rounded-lg border border-gray-300 p-2"><option value="">Seleccionar producto...</option>{productos.map((producto) => <option key={producto.id} value={producto.id}>{producto.nombre}</option>)}</select>
              <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-md border border-gray-200 bg-gray-50 p-2 text-xs text-gray-700"><input type="checkbox" checked={false} onChange={() => { actualizarLinea(index, "tipo_linea", "ajuste"); actualizarLinea(index, "es_ajuste_negativo", true); actualizarLinea(index, "precio_unitario", -Math.abs(Number(linea.precio_unitario ?? 0))) }} /> Marcar como ajuste negativo</label>
              {!linea.producto_id && !linea.producto_sugerido_id && linea.descripcionLeida && <button type="button" onClick={() => crearProductoDesdeLinea(index, linea.descripcionLeida ?? "", Math.abs(Number(linea.precio_unitario ?? 0)), Number(linea.iva ?? 21))} className="mt-2 w-full rounded-md bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700">+ Crear este producto</button>}
              {linea.confianza === "alta" && <div className="mt-2 rounded-md bg-green-50 p-2"><p className="text-xs font-semibold text-green-700">🟢 {linea.score ?? ""}% de confianza</p><p className="text-xs text-green-600">{linea.motivo}</p></div>}
              {linea.confianza === "media" && linea.producto_sugerido_id && <div className="mt-2 rounded-md border border-yellow-200 bg-yellow-50 p-3"><p className="text-xs font-semibold text-yellow-700">🟡 Sugerencia de IA · {linea.score ?? 0}%</p><p className="mt-1 text-xs text-yellow-700">{linea.motivo}</p><div className="mt-2 rounded-md bg-white p-2"><p className="text-[11px] text-gray-500">Producto sugerido</p><p className="text-sm font-semibold text-gray-800">{linea.producto_sugerido_nombre}</p></div><button type="button" onClick={() => actualizarProductoDeLinea(index, linea.producto_sugerido_id!)} className="mt-2 w-full rounded-md bg-yellow-500 px-3 py-2 text-xs font-semibold text-white hover:bg-yellow-600">✓ Usar esta sugerencia</button></div>}
              {linea.confianza === "media" && !linea.producto_sugerido_id && <div className="mt-2 rounded-md bg-yellow-50 p-2"><p className="text-xs font-semibold text-yellow-700">🟡 Coincidencia parcial</p><p className="text-xs text-yellow-700">{linea.motivo}</p></div>}
              {linea.confianza === "baja" && <div className="mt-2 rounded-md bg-red-50 p-2"><p className="text-xs font-semibold text-red-700">🔴 Producto no reconocido</p><p className="text-xs text-red-700">Seleccione el producto correcto.</p></div>}
              {linea.fuente === "alias" && <div className="mt-2 rounded-md bg-blue-50 p-2"><p className="text-xs font-semibold text-blue-700">🧠 Aprendido</p><p className="text-xs text-blue-600">100% de confianza · Reconocido por historial del proveedor.</p></div>}
              {linea.descripcionLeida && <div className="mt-2 rounded bg-gray-100 p-2"><p className="text-[11px] text-gray-500">Texto leído por IA</p><p className="text-xs font-medium">{linea.descripcionLeida}</p></div>}
            </>}</div>
            <input type="number" min={esAjuste ? 1 : 0} step="0.01" value={linea.cantidad} onChange={(e) => actualizarLinea(index, "cantidad", Number(e.target.value))} className="w-full rounded-lg border border-gray-300 p-2 text-center" />
            <input type="number" step="0.01" value={linea.precio_unitario} onChange={(e) => actualizarLinea(index, "precio_unitario", Number(e.target.value))} className={`w-full rounded-lg border p-2 text-right ${esAjuste ? "border-red-300 text-red-700" : "border-gray-300"}`} />
            <div className="rounded-lg bg-gray-50 p-2 text-right text-sm">${dinero(descuento)}</div><div className="rounded-lg bg-gray-50 p-2 text-right text-sm">${dinero(totalBonificacion)}</div><div className={`rounded-lg p-2 text-right text-sm font-medium ${esAjuste ? "bg-red-100 text-red-800" : "bg-gray-50"}`}>${dinero(precioNeto)}</div>
            <select value={linea.iva} onChange={(e) => actualizarLinea(index, "iva", Number(e.target.value))} className="w-full rounded-lg border border-gray-300 p-2 text-center"><option value={21}>21%</option><option value={10.5}>10,5%</option><option value={0}>0%</option></select>
            <div className={`rounded-lg p-2 text-right text-sm font-medium ${esAjuste ? "bg-red-100 text-red-700" : "bg-blue-50 text-blue-700"}`}>${dinero(ivaImporte)}</div><div className={`rounded-lg p-2 text-right text-sm font-medium ${esAjuste ? "bg-red-100 text-red-700" : "bg-orange-50 text-orange-700"}`}>${dinero(impuestosInternos)}</div><div className={`rounded-lg p-2 text-right text-sm font-semibold ${esAjuste ? "bg-red-100 text-red-900" : "bg-gray-100"}`}>${dinero(totalLinea)}</div><div className="flex justify-center"><button type="button" onClick={() => quitarLinea(index)} className="rounded-lg px-2 py-2 text-red-600 transition hover:bg-red-50 hover:text-red-700">✕</button></div>
          </div>;
        })}
      </div></div>}
      {lineas.length > 0 && <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">Consejo: las coincidencias de confianza media se muestran como sugerencias para que pueda revisarlas antes de asignarlas.</div>}
    </div>
  );
}
