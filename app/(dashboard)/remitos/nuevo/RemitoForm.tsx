'use client'

import { useMemo, useRef, useState } from "react"

import { crearRemito } from "./actions"
import CargaIA from "./components/CargaIA"
import DatosComprobante from "./components/DatosComprobante"
import ProductosRemito, { LineaRemito } from "./components/ProductosRemito"
import PagoRemito from "./components/PagoRemito"
import { leerRemitoConIA, usarGPTParaRemito } from "@/lib/ai/actions"
import { matchearProducto } from "@/lib/ai/matchear-producto"

type Proveedor = { id: string; nombre_fantasia: string }
type Empresa = { id: string; razon_social: string }
type Producto = { id: string; nombre: string; codigo: string | null }
type FormaPago = { id: string; nombre: string }

type Props = {
  proveedores: Proveedor[]
  empresas: Empresa[]
  productos: Producto[]
  formasPago: FormaPago[]
}

export function RemitoForm({ proveedores, empresas, productos, formasPago }: Props) {
  const [lineas, setLineas] = useState<LineaRemito[]>([])
  const [proveedorId, setProveedorId] = useState("")
  const [numero, setNumero] = useState("")
  const [fecha, setFecha] = useState("")
  const [fechaVencimiento, setFechaVencimiento] = useState("")
  const [leyendoIA, setLeyendoIA] = useState(false)
  const [errorIA, setErrorIA] = useState<string | null>(null)
  const [fallbackIA, setFallbackIA] = useState<{ base64: string; mimeType: string; logId: string | null; mensaje: string } | null>(null)
  const inputArchivoRef = useRef<HTMLInputElement>(null)
  const [pagarAlCargar, setPagarAlCargar] = useState(false)
  const [montoPago, setMontoPago] = useState(0)
  const [pagoTocado, setPagoTocado] = useState(false)

  const agregarLinea = () => {
    setLineas((prev) => [
      ...prev,
      {
        producto_id: "",
        cantidad: 1,
        precio_unitario: 0,
        descuento: 0,
        bonificacion_importe: 0,
      },
    ])
  }

  const quitarLinea = (index: number) => {
    setLineas((prev) => prev.filter((_, i) => i !== index))
  }

  const actualizarLinea = (
    index: number,
    campo: keyof LineaRemito,
    valor: string | number
  ) => {
    setLineas((prev) =>
      prev.map((linea, i) => (i === index ? { ...linea, [campo]: valor } : linea))
    )
  }

  const actualizarProductoDeLinea = (index: number, productoId: string) => {
    setLineas((prev) =>
      prev.map((linea, i) => (i === index ? { ...linea, producto_id: productoId } : linea))
    )
  }

  const { subtotalBruto, descuentoTotal, bonificacionTotal, total } = useMemo(() => {
    let subtotalBruto = 0
    let descuentoTotal = 0
    let bonificacionTotal = 0

    lineas.forEach((linea) => {
      subtotalBruto += linea.cantidad * linea.precio_unitario
      descuentoTotal += Number(linea.descuento ?? 0)
      bonificacionTotal += Number(linea.bonificacion_importe ?? 0)
    })

    return {
      subtotalBruto,
      descuentoTotal,
      bonificacionTotal,
      total: Math.max(0, subtotalBruto - descuentoTotal - bonificacionTotal),
    }
  }, [lineas])

  const montoPagoMostrado = pagoTocado ? montoPago : total

  const archivoABase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "")
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  async function manejarArchivoIA(file: File) {
    setLeyendoIA(true)
    setErrorIA(null)
    setFallbackIA(null)

    try {
      const base64 = await archivoABase64(file)
      const datos = await leerRemitoConIA(base64, file.type)
      aplicarDatosRemitoIA(datos)
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "No se pudo leer el comprobante."

      if (mensaje.startsWith("GEMINI_FALLBACK_REQUIRED|")) {
        const partes = mensaje.split("|")
        const logId = partes[1] || null
        const motivo = partes.slice(2).join("|") || "Gemini no pudo procesar el documento."

        try {
          const base64 = await archivoABase64(file)
          setFallbackIA({ base64, mimeType: file.type, logId, mensaje: motivo })
          setErrorIA(null)
        } catch {
          setErrorIA("No se pudo preparar el documento para el procesamiento alternativo.")
        }
      } else {
        setErrorIA(mensaje)
      }
    } finally {
      setLeyendoIA(false)
      if (inputArchivoRef.current) inputArchivoRef.current.value = ""
    }
  }

  function aplicarDatosRemitoIA(datos: Awaited<ReturnType<typeof leerRemitoConIA>>) {
    if (datos.proveedor_nombre) {
      const proveedor = matchearProducto(
        datos.proveedor_nombre,
        proveedores.map((p) => ({ id: p.id, nombre: p.nombre_fantasia }))
      )
      if (proveedor) setProveedorId(proveedor.id)
    }

    if (datos.numero) setNumero(datos.numero)
    if (datos.fecha) setFecha(datos.fecha)
    if (datos.fecha_vencimiento) setFechaVencimiento(datos.fecha_vencimiento)

    if (datos.lineas.length > 0) {
      setLineas(
        datos.lineas.map((l) => {
          const match = matchearProducto(l.descripcion, productos)
          const bruto = Number(l.cantidad || 1) * Number(l.precio_unitario || 0)
          const descuento = Number(l.descuento ?? 0)
          const precioNeto = Math.max(0, Number(l.precio_final ?? bruto - descuento))
          const bonificacionImporte = Math.max(0, bruto - descuento - precioNeto)

          return {
            producto_id: match?.id ?? "",
            cantidad: l.cantidad || 1,
            precio_unitario: l.precio_unitario || 0,
            descuento,
            bonificacion_importe: bonificacionImporte,
            porcentaje_descuento: l.porcentaje_descuento ?? null,
            bonificacion_tipo: l.grupo_descuento ?? null,
            cantidad_bonificada: null,
            descripcionLeida: l.descripcion,
            autoMatcheado: Boolean(match),
            precio_final: precioNeto,
          }
        })
      )
    }
  }

  async function autorizarGPT() {
    if (!fallbackIA) return

    setLeyendoIA(true)
    setErrorIA(null)

    try {
      const datos = await usarGPTParaRemito(
        fallbackIA.base64,
        fallbackIA.mimeType,
        fallbackIA.logId
      )
      aplicarDatosRemitoIA(datos)
      setFallbackIA(null)
    } catch (error) {
      setErrorIA(
        error instanceof Error
          ? error.message
          : "No se pudo procesar el documento con GPT-4o-mini."
      )
    } finally {
      setLeyendoIA(false)
    }
  }

  return (
    <form action={crearRemito} className="space-y-6">
      <input type="hidden" name="items" value={JSON.stringify(lineas)} />
      <input type="hidden" name="subtotal_bruto" value={subtotalBruto} />
      <input type="hidden" name="descuento_total" value={descuentoTotal} />
      <input type="hidden" name="bonificacion_total" value={bonificacionTotal} />
      <input type="hidden" name="total" value={total} />

      <CargaIA
        inputArchivoRef={inputArchivoRef}
        leyendoIA={leyendoIA}
        errorIA={errorIA}
        manejarArchivoIA={manejarArchivoIA}
      />

      {fallbackIA && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5">
          <div className="mb-3">
            <h3 className="text-base font-semibold text-amber-900">⚠️ Gemini no pudo procesar el documento</h3>
            <p className="mt-1 text-sm text-amber-800">{fallbackIA.mensaje}</p>
          </div>
          <p className="mb-4 text-sm text-gray-700">Podés intentar procesarlo con <strong>GPT-4o-mini</strong> como alternativa.</p>
          <div className="flex gap-3">
            <button type="button" onClick={autorizarGPT} disabled={leyendoIA} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50">
              {leyendoIA ? "Procesando con GPT..." : "Usar GPT-4o-mini"}
            </button>
            <button type="button" onClick={() => { setFallbackIA(null); setErrorIA(null) }} disabled={leyendoIA} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <DatosComprobante
        proveedores={proveedores}
        empresas={empresas}
        proveedorId={proveedorId}
        setProveedorId={setProveedorId}
        numero={numero}
        setNumero={setNumero}
        fecha={fecha}
        setFecha={setFecha}
        fechaVencimiento={fechaVencimiento}
        setFechaVencimiento={setFechaVencimiento}
      />

      <ProductosRemito
        productos={productos}
        lineas={lineas}
        agregarLinea={agregarLinea}
        quitarLinea={quitarLinea}
        actualizarLinea={actualizarLinea}
        actualizarProductoDeLinea={actualizarProductoDeLinea}
      />

      <PagoRemito
        pagarAlCargar={pagarAlCargar}
        setPagarAlCargar={setPagarAlCargar}
        montoPagoMostrado={montoPagoMostrado}
        setMontoPago={setMontoPago}
        setPagoTocado={setPagoTocado}
        total={total}
        formasPago={formasPago}
      />

      <button
        type="submit"
        disabled={lineas.length === 0}
        className="rounded-lg bg-black px-5 py-2 text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Guardar remito
      </button>
    </form>
  )
}
