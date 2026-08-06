"use client";

type FormaPago = {
  id: string;
  nombre: string;
};

type Props = {
  pagarAlCargar: boolean;
  setPagarAlCargar: (value: boolean) => void;

  montoPagoMostrado: number;
  setMontoPago: (value: number) => void;
  setPagoTocado: (value: boolean) => void;

  total: number;

  formasPago: FormaPago[];
};

export default function PagoFactura({
  pagarAlCargar,
  setPagarAlCargar,
  montoPagoMostrado,
  setMontoPago,
  setPagoTocado,
  total,
  formasPago,
}: Props) {
  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <h2 className="mb-6 text-xl font-semibold">
        💳 Pago
      </h2>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={pagarAlCargar}
          onChange={(e) =>
            setPagarAlCargar(e.target.checked)
          }
        />

        Registrar pago al guardar la factura
      </label>

      {pagarAlCargar && (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">
              Monto pagado
            </label>

            <input
              type="number"
              name="pago_monto"
              step="0.01"
              min="0"
              value={montoPagoMostrado}
              onChange={(e) => {
                setPagoTocado(true);
                setMontoPago(Number(e.target.value));
              }}
              required
              className="w-full rounded-lg border border-gray-300 p-2"
            />

            <p className="mt-1 text-xs text-gray-500">
              Total factura: $
              {total.toLocaleString("es-AR", {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">
              Forma de pago
            </label>

            <select
              name="pago_forma_pago_id"
              required
              className="w-full rounded-lg border border-gray-300 p-2"
            >
              <option value="">
                Seleccionar...
              </option>

              {formasPago.map((forma) => (
                <option
                  key={forma.id}
                  value={forma.id}
                >
                  {forma.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">
              Fecha de pago
            </label>

            <input
              type="date"
              name="pago_fecha"
              required
              className="w-full rounded-lg border border-gray-300 p-2"
            />
          </div>
        </div>
      )}

      <input
        type="hidden"
        name="pagar_al_cargar"
        value={pagarAlCargar ? "1" : ""}
      />
    </div>
  );
}