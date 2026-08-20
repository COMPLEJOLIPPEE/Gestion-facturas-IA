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
            <div>Cant.</div>
            <div>Precio</div>
            <div>DTO.</div>
            <div>IVA</div>
            <div className="col-span-2 text-right">Neto</div>
            <div />
          </div>

          <div className="space-y-3">
            {lineas.map((linea, index) => (
              <div key={index} className="grid grid-cols-12 items-center gap-3 rounded-lg border p-3">
                <div className="col-span-4 min-w-0">
                  <select
                    value={linea.producto_id}
                    onChange={(e) => actualizarProductoDeLinea(index, e.target.value)}
                    className="w-full rounded-md border px-2 py-2 text-sm"
                  >
                    <option value="">Seleccionar producto</option>
                    {productos.map((producto) => (
                      <option key={producto.id} value={producto.id}>
                        {producto.codigo ? `${producto.codigo} - ` : ""}{producto.nombre}
                      </option>
                    ))}
                  </select>
                  {linea.descripcionLeida && (
                    <p className="mt-1 truncate text-xs text-gray-500" title={linea.descripcionLeida}>
                      IA: {linea.descripcionLeida}
                    </p>
                  )}
                </div>

                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={linea.cantidad}
                  onChange={(e) => actualizarLinea(index, "cantidad", Number(e.target.value))}
                  className="rounded-md border px-2 py-2 text-sm"
                />

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={linea.precio_unitario}
                  onChange={(e) => actualizarLinea(index, "precio_unitario", Number(e.target.value))}
                  className="rounded-md border px-2 py-2 text-sm"
                />

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={linea.descuento}
                  onChange={(e) => actualizarLinea(index, "descuento", Number(e.target.value))}
                  className="rounded-md border px-2 py-2 text-sm"
                />

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={linea.iva}
                  onChange={(e) => actualizarLinea(index, "iva", Number(e.target.value))}
                  className="rounded-md border px-2 py-2 text-sm"
                />

                <div className="col-span-2 text-right text-sm font-medium">
                  ${Number(linea.subtotal_neto ?? linea.precio_final ?? 0).toLocaleString("es-AR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => quitarLinea(index)}
                  className="rounded-md border px-2 py-2 text-sm text-red-600 hover:bg-red-50"
                  title="Eliminar línea"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
