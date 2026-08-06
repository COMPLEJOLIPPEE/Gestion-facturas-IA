"use client";

type Props = {
  subtotal: number;
  iva: number;
  total: number;
};

export default function ImpuestosFactura({
  subtotal,
  iva,
  total,
}: Props) {
  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <h2 className="mb-6 text-xl font-semibold">
        💰 Impuestos y totales
      </h2>

      <div className="grid gap-3 max-w-md ml-auto">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Subtotal</span>
          <span>
            ${subtotal.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-500">IVA</span>
          <span>
            ${iva.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>

        <div className="border-t pt-3 flex justify-between text-lg font-semibold">
          <span>Total</span>
          <span>
            ${total.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>
      </div>
    </div>
  );
}