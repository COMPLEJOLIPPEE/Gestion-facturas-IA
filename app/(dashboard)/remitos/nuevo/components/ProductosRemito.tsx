"use client";

type Producto = {
  id: string;
  nombre: string;
  codigo: string | null;
};

export type LineaRemito = {
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  descuento?: number;
  precio_final?: number;
  bonificacion_importe?: number;
  porcentaje_descuento?: number | null;
  bonificacion_tipo?: string | null;
  cantidad_bonificada?: number | null;
  codigo_proveedor?: string;
  descripcion_proveedor?: string;
  descripcionLeida?: string;
  autoMatcheado?: boolean;
};

type Props = {
  productos: Producto[];
  lineas: LineaRemito[];
  agregarLinea: () => void;
  quitarLinea: (index: number) => void;
  actualizarLinea: (
    index: number,
    campo: keyof LineaRemito,
    valor: string | number
  ) => void;
  actualizarProductoDeLinea: (index: number, productoId: string) => void;
};

const money = (value: number) =>
  value.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function ProductosRemito({
  productos,
  lineas,
  agregarLinea,
  quitarLinea,
  actualizarLinea,
  actualizarProductoDeLinea,
}: Props) {
  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Productos</h2>
          <p className="mt-1 text-sm text-gray-500">
            Revise los productos detectados por IA o agregue nuevos manualmente.
          </p>
        </div>
        <button type="button" onClick={agregarLinea} className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-gray-800">
          + Agregar producto
        </button>
      </div>

      {lineas.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center text-gray-500">
          Todavía no hay productos cargados.
        </div>
      )}

      {lineas.length > 0 && (
        <>
          <div className="mb-3 grid grid-cols-12 gap-3 border-b pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <div className="col-span-3">Producto</div>
            <div className="col-span-1 text-center">Cantidad</div>
            <div className="col-span-2 text-right">Precio Unit.</div>
            <div className="col-span-2 text-right">Desc. / Bonif.</div>
            <div className="col-span-2 text-right">Precio Neto</div>
            <div className="col-span-1 text-right">Subtotal</div>
            <div className="col-span-1" />
          </div>

          {lineas.map((linea, index) => {
            const bruto = linea.cantidad * linea.precio_unitario;
            const porcentaje = Number(linea.descuento ?? 0);
            const descuentoImporte = bruto * (porcentaje / 100);
            const bonificacion = Math.max(0, Number(linea.bonificacion_importe ?? 0));
            const neto = Math.max(0, bruto - descuentoImporte - bonificacion);

            return (
              <div key={index} className="mb-5 grid grid-cols-12 items-start gap-3 border-b pb-4 last:border-0">
                <div className="col-span-3">
                  <select value={linea.producto_id} required onChange={(e) => actualizarProductoDeLinea(index, e.target.value)} className="w-full rounded-lg border border-gray-300 p-2">
                    <option value="">Seleccionar producto...</option>
                    {productos.map((producto) => (
                      <option key={producto.id} value={producto.id}>{producto.nombre}</option>
                    ))}
                  </select>
                  {linea.autoMatcheado && <p className="mt-1 text-xs text-green-600">🟢 Producto reconocido automáticamente</p>}
                  {!linea.autoMatcheado && linea.descripcionLeida && (
                    <div className="mt-2 rounded-md bg-red-50 p-2">
                      <p className="text-xs font-semibold text-red-700">🔴 Producto no reconocido</p>
                      <p className="text-xs text-red-700">Seleccione el producto correcto.</p>
                    </div>
                  )}
                  {linea.descripcionLeida && (
                    <div className="mt-2 rounded bg-gray-100 p-2">
                      <p className="text-[11px] text-gray-500">Texto leído por IA</p>
                      <p className="text-xs font-medium">{linea.descripcionLeida}</p>
                    </div>
                  )}
                </div>

                <div className="col-span-1">
                  <input type="number" min="0" step="0.01" value={linea.cantidad} onChange={(e) => actualizarLinea(index, "cantidad", Number(e.target.value))} className="w-full rounded-lg border border-gray-300 p-2 text-center" />
                </div>

                <div className="col-span-2">
                  <input type="number" min="0" step="0.01" value={linea.precio_unitario} onChange={(e) => actualizarLinea(index, "precio_unitario", Number(e.target.value))} className="w-full rounded-lg border border-gray-300 p-2 text-right" />
                  <p className="mt-1 text-right text-[11px] text-gray-400">Bruto: ${money(bruto)}</p>
                </div>

                <div className="col-span-2 space-y-2">
                  <div>
                    <label className="mb-1 block text-[11px] text-gray-500">Descuento (%)</label>
                    <input type="number" min="0" max="100" step="0.01" value={porcentaje} onChange={(e) => actualizarLinea(index, "descuento", Number(e.target.value))} placeholder="0" className="w-full rounded-lg border border-gray-300 p-2 text-right" />
                    <p className="mt-1 text-right text-[11px] text-gray-400">-${money(descuentoImporte)}</p>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-gray-500">Bonificación ($)</label>
                    <input type="number" min="0" step="0.01" value={bonificacion} onChange={(e) => actualizarLinea(index, "bonificacion_importe", Number(e.target.value))} placeholder="0" className="w-full rounded-lg border border-gray-300 p-2 text-right" />
                  </div>
                  {(linea.bonificacion_tipo || linea.cantidad_bonificada) && (
                    <p className="text-[11px] text-blue-600">
                      Bonificación: {linea.bonificacion_tipo ?? "por cantidad"}{linea.cantidad_bonificada ? ` · ${linea.cantidad_bonificada} unidad(es)` : ""}
                    </p>
                  )}
                </div>

                <div className="col-span-2">
                  <div className="rounded-lg bg-gray-50 p-2 text-right font-medium">${money(linea.cantidad > 0 ? neto / linea.cantidad : 0)}</div>
                  <p className="mt-1 text-right text-[11px] text-gray-400">Neto unitario</p>
                </div>

                <div className="col-span-1">
                  <div className="rounded-lg bg-gray-50 p-2 text-right font-medium">${money(neto)}</div>
                </div>

                <div className="col-span-1 flex justify-center">
                  <button type="button" onClick={() => quitarLinea(index)} className="rounded-lg px-2 py-2 text-red-600 transition hover:bg-red-50 hover:text-red-700">✕</button>
                </div>
              </div>
            );
          })}

          <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-5">
            <div className="ml-auto max-w-sm space-y-2 text-sm">
              <div className="flex justify-between"><span>Subtotal bruto</span><span>${money(lineas.reduce((s, l) => s + l.cantidad * l.precio_unitario, 0))}</span></div>
              <div className="flex justify-between text-red-600"><span>Descuentos</span><span>− ${money(lineas.reduce((s, l) => s + l.cantidad * l.precio_unitario * (Number(l.descuento ?? 0) / 100), 0))}</span></div>
              <div className="flex justify-between text-red-600"><span>Bonificaciones</span><span>− ${money(lineas.reduce((s, l) => s + Math.max(0, Number(l.bonificacion_importe ?? 0)), 0))}</span></div>
              <div className="my-3 border-t border-gray-300" />
              <div className="flex justify-between text-lg font-bold"><span>TOTAL REMITO</span><span>${money(lineas.reduce((s, l) => {
                const bruto = l.cantidad * l.precio_unitario;
                return s + Math.max(0, bruto - bruto * (Number(l.descuento ?? 0) / 100) - Math.max(0, Number(l.bonificacion_importe ?? 0)));
              }, 0))}</span></div>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
            Los remitos no llevan IVA ni impuestos. El total de cada línea es el precio bruto menos el descuento porcentual y las bonificaciones en pesos.
          </div>
        </>
      )}
    </div>
  );
}
