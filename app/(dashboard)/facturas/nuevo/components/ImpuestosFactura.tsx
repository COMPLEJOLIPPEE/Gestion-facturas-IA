"use client";

type Cargo = { descripcion: string; importe: number };
type Props = { subtotal: number; descuentos: number; iva: number; impuestosInternos: number; cargos: Cargo[]; total: number };

function dinero(valor: number) {
  return Math.abs(Number(valor ?? 0)).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ImpuestosFactura({ subtotal, descuentos, iva, impuestosInternos, cargos, total }: Props) {
  const cargosInternos = cargos.filter((cargo) => /impuestos?\s+internos?/i.test(cargo.descripcion));
  const otrosCargos = cargos.filter((cargo) => !/impuestos?\s+internos?/i.test(cargo.descripcion));
  const totalInternos = impuestosInternos + cargosInternos.reduce((acc, cargo) => acc + Number(cargo.importe ?? 0), 0);

  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <h2 className="mb-6 text-xl font-semibold">💰 Impuestos y totales</h2>
      <input type="hidden" name="cargos" value={JSON.stringify(cargos)} />
      <div className="grid max-w-md gap-3 ml-auto">
        <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal neto</span><span>${dinero(subtotal)}</span></div>
        <div className="flex justify-between text-sm"><span className="text-gray-500">Descuentos y bonificaciones</span><span className={descuentos > 0 ? "text-red-600" : "text-gray-700"}>-${dinero(descuentos)}</span></div>
        <div className="flex justify-between text-sm"><span className="text-gray-500">IVA</span><span>${dinero(iva)}</span></div>
        <div className="flex justify-between text-sm"><span className="text-gray-500">Impuestos internos</span><span>${dinero(totalInternos)}</span></div>
        {otrosCargos.length > 0 && (
          <div className="mt-2 border-t pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Percepciones y otros cargos</p>
            {otrosCargos.map((cargo, index) => (
              <div key={index} className="flex justify-between text-sm"><span className="text-gray-500">{cargo.descripcion}</span><span>${dinero(cargo.importe)}</span></div>
            ))}
          </div>
        )}
        <div className="mt-2 flex justify-between border-t pt-3 text-lg font-semibold"><span>Total</span><span>${dinero(total)}</span></div>
      </div>
    </div>
  );
}
