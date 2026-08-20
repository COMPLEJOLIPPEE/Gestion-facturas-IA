"use client";

type Producto = {
  id: string;
  nombre: string;
  codigo: string | null;
  marca?: string | null;
  categoria?: string | null;
};

export type LineaFactura = {
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  iva: number;
  descuento: number;
  precio_final: number;
  bonificacion?: number;
  cantidad_bonificada?: number;
  cantidad_bonificada_detalle?: number;
  tipo_bonificacion?: "cantidad" | "importe" | "porcentaje";
  precio_bruto_unitario?: number;
  precio_neto?: number;
  subtotal_neto?: number;
  impuestos_internos?: number;
  iva_importe?: number;
  codigo_proveedor?: string;
  descripcion_proveedor?: string;
  descripcionLeida?: string;
  autoMatcheado?: boolean;
  score?: number;
  confianza?: "alta" | "media" | "baja";
  motivo?: string;
  aprendido?: boolean;
  fuente?: "alias" | "smartmatch" | "manual";
  producto_sugerido_id?: string;
  producto_sugerido_nombre?: string;
};

type Props = {
  productos: Producto[];
  lineas: LineaFactura[];
  agregarLinea: () => void;
  quitarLinea: (index: number) => void;
  actualizarLinea: (
    index: number,
    campo: keyof LineaFactura,
    valor: string | number
  ) => void;
  actualizarProductoDeLinea: (index: number, productoId: string) => void;
  crearProductoDesdeLinea: (
    index: number,
    nombre: string,
    costo: number,
    iva: number
  ) => Promise<void>;
};

export default function ProductosFactura({
  productos,
  lineas,
  agregarLinea,
  quitarLinea,
  actualizarLinea,
  actualizarProductoDeLinea,
  crearProductoDesdeLinea,
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
        <button type="button" onClick={agregarLinea} className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:opacity-90">
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
            <div className="col-span-4">Producto</div>
            <div className="col-span-2 text-center">Cantidad</div>
            <div className="col-span-2 text-right">Precio Unit.</div>
            <div className="col-span-1 text-center">IVA</div>
            <div className="col-span-2 text-right">Subtotal</div>
            <div className="col-span-1"></div>
          </div>

          {lineas.map((linea, index) => {
            const cantidad = Number(linea.cantidad ?? 0);
            const precioUnitario = Number(linea.precio_unitario ?? 0);
            const bruto = cantidad * precioUnitario;
            const descuento = Number(linea.descuento ?? 0);
            const bonificacion = Number(linea.bonificacion ?? 0);
            const cantidadBonificada = Math.min(
              Math.max(0, Number(linea.cantidad_bonificada ?? linea.cantidad_bonificada_detalle ?? 0)),
              cantidad
            );
            const bonificacionCantidad = linea.tipo_bonificacion === "cantidad"
              ? cantidadBonificada * precioUnitario
              : 0;
            const subtotalNeto = linea.subtotal_neto != null
              ? Number(linea.subtotal_neto)
              : Math.max(0, bruto - descuento - bonificacion - bonificacionCantidad);
            const ivaImporte = Number(linea.iva_importe ?? subtotalNeto * (Number(linea.iva ?? 0) / 100));
            const impuestosInternos = Number(linea.impuestos_internos ?? 0);
            const subtotal = subtotalNeto + ivaImporte + impuestosInternos;

            return (
              <div key={index} className="mb-4 grid grid-cols-12 items-start gap-3">
                <div className="col-span-4">
                  <select value={linea.producto_id} required onChange={(e) => actualizarProductoDeLinea(index, e.target.value)} className="w-full rounded-lg border border-gray-300 p-2">
                    <option value="">Seleccionar producto...</option>
                    {productos.map((producto) => (
                      <option key={producto.id} value={producto.id}>{producto.nombre}</option>
                    ))}
                  </select>

                  {!linea.producto_id && !linea.producto_sugerido_id && linea.descripcionLeida && (
                    <button type="button" onClick={() => crearProductoDesdeLinea(index, linea.descripcionLeida ?? "", Number(linea.precio_unitario ?? 0), Number(linea.iva ?? 21))} className="mt-2 w-full rounded-md bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700">
                      + Crear este producto
                    </button>
                  )}

                  {linea.confianza === "alta" && (
                    <div className="mt-2 rounded-md bg-green-50 p-2">
                      <p className="text-xs font-semibold text-green-700">🟢 {linea.score ?? ""}% de confianza</p>
                      <p className="text-xs text-green-600">{linea.motivo}</p>
                    </div>
                  )}

                  {linea.confianza === "media" && linea.producto_sugerido_id && (
                    <div className="mt-2 rounded-md border border-yellow-200 bg-yellow-50 p-3">
                      <p className="text-xs font-semibold text-yellow-700">🟡 Sugerencia de IA · {linea.score ?? 0}% de confianza</p>
                      <p className="mt-1 text-xs text-yellow-700">{linea.motivo}</p>
                      <div className="mt-2 rounded-md bg-white p-2">
                        <p className="text-[11px] text-gray-500">Producto sugerido</p>
                        <p className="text-sm font-semibold text-gray-800">{linea.producto_sugerido_nombre}</p>
                      </div>
                      <button type="button" onClick={() => actualizarProductoDeLinea(index, linea.producto_sugerido_id!)} className="mt-2 w-full rounded-md bg-yellow-500 px-3 py-2 text-xs font-semibold text-white hover:bg-yellow-600">
                        ✓ Usar esta sugerencia
                      </button>
                    </div>
                  )}

                  {linea.confianza === "media" && !linea.producto_sugerido_id && (
                    <div className="mt-2 rounded-md bg-yellow-50 p-2">
                      <p className="text-xs font-semibold text-yellow-700">🟡 Coincidencia parcial</p>
                      <p className="text-xs text-yellow-700">{linea.motivo}</p>
                    </div>
                  )}

                  {linea.confianza === "baja" && (
                    <div className="mt-2 rounded-md bg-red-50 p-2">
                      <p className="text-xs font-semibold text-red-700">🔴 Producto no reconocido</p>
                      <p className="text-xs text-red-700">Seleccione el producto correcto.</p>
                    </div>
                  )}

                  {linea.fuente === "alias" && (
                    <div className="mt-2 rounded-md bg-blue-50 p-2">
                      <p className="text-xs font-semibold text-blue-700">🧠 Aprendido</p>
                      <p className="text-xs text-blue-600">100% de confianza · Reconocido por historial del proveedor.</p>
                    </div>
                  )}

                  {linea.descripcionLeida && (
                    <div className="mt-2 rounded bg-gray-100 p-2">
                      <p className="text-[11px] text-gray-500">Texto leído por IA</p>
                      <p className="text-xs font-medium">{linea.descripcionLeida}</p>
                    </div>
                  )}
                </div>

                <div className="col-span-2">
                  <input type="number" min="0" step="0.01" value={linea.cantidad} onChange={(e) => actualizarLinea(index, "cantidad", Number(e.target.value))} className="w-full rounded-lg border border-gray-300 p-2 text-center" />
                </div>

                <div className="col-span-2">
                  <input type="number" min="0" step="0.01" value={linea.precio_unitario} onChange={(e) => actualizarLinea(index, "precio_unitario", Number(e.target.value))} className="w-full rounded-lg border border-gray-300 p-2 text-right" />
                </div>

                <div className="col-span-1">
                  <select value={linea.iva} onChange={(e) => actualizarLinea(index, "iva", Number(e.target.value))} className="w-full rounded-lg border border-gray-300 p-2 text-center">
                    <option value={21}>21%</option>
                    <option value={10.5}>10,5%</option>
                    <option value={0}>0%</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <div className="rounded-lg bg-gray-50 p-2 text-right font-medium">
                    ${subtotal.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="col-span-1 flex justify-center">
                  <button type="button" onClick={() => quitarLinea(index)} className="rounded-lg px-2 py-2 text-red-600 transition hover:bg-red-50 hover:text-red-700">✕</button>
                </div>
              </div>
            );
          })}
        </>
      )}

      {lineas.length > 0 && (
        <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
          Consejo: las coincidencias de confianza media se muestran como sugerencias para que pueda revisarlas antes de asignarlas.
        </div>
      )}
    </div>
  );
}
