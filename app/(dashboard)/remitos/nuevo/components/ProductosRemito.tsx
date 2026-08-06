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

  actualizarProductoDeLinea: (
    index: number,
    productoId: string
  ) => void;
};

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
          <h2 className="text-xl font-semibold">
            📦 Productos
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Revise los productos detectados por IA o agregue nuevos manualmente.
          </p>
        </div>

        <button
          type="button"
          onClick={agregarLinea}
          className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:opacity-90"
        >
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

            <div className="col-span-4">
              Producto
            </div>

            <div className="col-span-2 text-center">
              Cantidad
            </div>

            <div className="col-span-2 text-right">
              Precio Unit.
            </div>


            <div className="col-span-3 text-right">
              Subtotal
            </div>

            <div className="col-span-1"></div>

          </div>

          {lineas.map((linea, index) => {

            const subtotal =
              linea.cantidad *
              linea.precio_unitario;

            return (

              <div
                key={index}
                className="mb-4 grid grid-cols-12 items-start gap-3"
              >

                <div className="col-span-4">

                  <select
                    value={linea.producto_id}
                    required
                    onChange={(e) =>
                      actualizarProductoDeLinea(
                        index,
                        e.target.value
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 p-2"
                  >
                    <option value="">
                      Seleccionar producto...
                    </option>

                    {productos.map((producto) => (
                      <option
                        key={producto.id}
                        value={producto.id}
                      >
                        {producto.nombre}
                      </option>
                    ))}
                  </select>

                  {linea.autoMatcheado && (

                    <p className="mt-1 text-xs text-green-600">

                      ✓ Producto reconocido automáticamente

                    </p>

                  )}

                  {!linea.autoMatcheado &&
                    linea.descripcionLeida && (

                      <p className="mt-1 text-xs text-amber-600">

                        ⚠ Producto no reconocido.
                        Seleccione el producto correspondiente.

                      </p>

                  )}
                                    <p className="mt-1 text-xs text-gray-400">

                    {linea.descripcionLeida &&
                      `Texto leído: ${linea.descripcionLeida}`}

                  </p>

                </div>

                <div className="col-span-2">

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={linea.cantidad}
                    onChange={(e) =>
                      actualizarLinea(
                        index,
                        "cantidad",
                        Number(e.target.value)
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 p-2 text-center"
                  />

                </div>

                <div className="col-span-2">

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={linea.precio_unitario}
                    onChange={(e) =>
                      actualizarLinea(
                        index,
                        "precio_unitario",
                        Number(e.target.value)
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 p-2 text-right"
                  />


                </div>

                <div className="col-span-2">

                  <div className="rounded-lg bg-gray-50 p-2 text-right font-medium">

                    $
                    {subtotal.toLocaleString(
                      "es-AR",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}

                  </div>

                </div>

                <div className="col-span-1 flex justify-center">

                  <button
                    type="button"
                    onClick={() =>
                      quitarLinea(index)
                    }
                    className="rounded-lg px-2 py-2 text-red-600 transition hover:bg-red-50 hover:text-red-700"
                  >
                    ✕

                  </button>

                </div>

              </div>

            );

          })}

        </>

      )}

      {lineas.length > 0 && (

        <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">

          💡 Consejo: cuando un producto no sea reconocido por la IA,
          podrá asociarse o crearse directamente desde esta pantalla
          en una próxima actualización.

        </div>

      )}

    </div>

  );

}