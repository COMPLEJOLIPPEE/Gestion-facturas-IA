import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"

type Props = {
  params: Promise<{ id: string }>
}

export default async function RemitoConfirmacionPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: remito, error } = await supabase
    .from("remitos")
    .select("id, codigo_interno, numero")
    .eq("id", id)
    .single()

  if (error || !remito) notFound()

  const codigo = `R-${String(Number(remito.codigo_interno)).padStart(4, "0")}`

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
          ✓
        </div>

        <p className="text-sm font-semibold uppercase tracking-wider text-green-700">
          Remito guardado correctamente
        </p>

        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          Anotá el código en el comprobante
        </h1>

        <p className="mx-auto mt-3 max-w-md text-gray-600">
          Antes de continuar, anotá este código en el remito o factura física del proveedor.
          Te va a servir para encontrarlo rápidamente después.
        </p>

        <div className="my-7 rounded-xl bg-black px-6 py-5 text-white">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-gray-300">
            Código interno
          </p>
          <p className="mt-2 text-5xl font-black tracking-wider">{codigo}</p>
          {remito.numero && (
            <p className="mt-3 text-sm text-gray-300">
              Remito proveedor: <span className="font-semibold text-white">{remito.numero}</span>
            </p>
          )}
        </div>

        <p className="mb-5 text-sm font-medium text-gray-700">
          ✍️ Escribí <span className="font-bold">{codigo}</span> en el comprobante físico.
        </p>

        <Link
          href={`/remitos/${remito.id}`}
          className="inline-flex w-full items-center justify-center rounded-lg bg-black px-5 py-3 font-semibold text-white transition hover:opacity-90"
        >
          Ya lo anoté — Ver comprobante completo
        </Link>
      </div>
    </div>
  )
}
