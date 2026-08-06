"use client";

import { RefObject } from "react";

type Props = {
  leyendoIA: boolean;
  errorIA: string | null;
  inputArchivoRef: RefObject<HTMLInputElement | null>;
  manejarArchivoIA: (file: File) => Promise<void>;
};

export default function CargaIA({
  leyendoIA,
  errorIA,
  inputArchivoRef,
  manejarArchivoIA,
}: Props) {
  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">
          🤖 Procesar comprobante con IA
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Subí una imagen o un PDF. La IA intentará completar automáticamente
          el proveedor, número, fechas y productos de la factura.
        </p>
      </div>

      <input
        ref={inputArchivoRef}
        type="file"
        accept="application/pdf,image/*"
        disabled={leyendoIA}
        className="block w-full rounded-lg border border-gray-300 p-2 text-sm"
        onChange={(e) => {
          const archivo = e.target.files?.[0];

          if (archivo) {
            manejarArchivoIA(archivo);
          }
        }}
      />

      {leyendoIA && (
        <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
          Procesando comprobante...
        </div>
      )}

      {errorIA && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {errorIA}
        </div>
      )}
    </div>
  );
}