"use client";

type Cargo = {
  descripcion: string;
  importe: number;
};

type Props = {
  subtotal: number;
  descuentos: number;
  iva: number;
  cargos: Cargo[];
  total: number;
};

export default function ImpuestosFactura({
  subtotal,
  descuentos,
  iva,
  cargos,
  total,
}: Props) {
  return (
    <div className="rounded-xl bg-white p-6 shadow">

      <h2 className="mb-6 text-xl font-semibold">
        💰 Impuestos y totales
      </h2>

      <div className="grid max-w-md gap-3 ml-auto">

        {/* SUBTOTAL */}

        <div className="flex justify-between text-sm">
          <span className="text-gray-500">
            Subtotal
          </span>

          <span>
            $
            {subtotal.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>

        {/* DESCUENTOS */}

        {descuentos > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">
              Descuentos
            </span>

            <span className="text-red-600">
              -$
              {descuentos.toLocaleString("es-AR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        )}

        {/* IVA */}

        <div className="flex justify-between text-sm">
          <span className="text-gray-500">
            IVA
          </span>

          <span>
            $
            {iva.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>

        {/* PERCEPCIONES / CARGOS */}

        {cargos.length > 0 && (
          <div className="mt-2 border-t pt-3">

            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Percepciones y otros cargos
            </p>

            {cargos.map((cargo, index) => (
              <div
                key={index}
                className="flex justify-between text-sm"
              >
                <span className="text-gray-500">
                  {cargo.descripcion}
                </span>

                <span>
                  $
                  {Math.abs(
                    Number(cargo.importe ?? 0)
                  ).toLocaleString("es-AR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            ))}

          </div>
        )}

        {/* TOTAL */}

        <div className="mt-2 flex justify-between border-t pt-3 text-lg font-semibold">
          <span>
            Total
          </span>

          <span>
            $
            {total.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>

      </div>
    </div>
  );
}