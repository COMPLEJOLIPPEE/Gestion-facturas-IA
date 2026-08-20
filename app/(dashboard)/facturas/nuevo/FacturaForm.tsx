'use client'

import { useMemo, useRef, useState } from "react"
import {
  crearFactura,
  crearProductoDesdeFactura,
} from "./actions"

import CargaIA from "./components/CargaIA"
import DatosComprobante from "./components/DatosComprobante"
import ProductosFactura, {
  LineaFactura,
} from "./components/ProductosFactura"
import ImpuestosFactura from "./components/ImpuestosFactura"
import PagoFactura from "./components/PagoFactura"

import {
  leerFacturaConIA,
  procesarLineasFacturaConIA,
  usarOCRParaFactura,
} from "@/lib/ai/actions"


type Proveedor = {
  id: string
  nombre_fantasia: string
}

type Empresa = {
  id: string
  razon_social: string
}

type Producto = {
  id: string
  nombre: string
  codigo: string | null
}

type FormaPago = {
  id: string
  nombre: string
}

type Props = {
  proveedores: Proveedor[]
  empresas: Empresa[]
  productos: Producto[]
  formasPago: FormaPago[]
}

export function FacturaForm({
  proveedores,
  empresas,
  productos,
  formasPago,
}: Props) {

  const [lineas, setLineas] = useState<LineaFactura[]>([])
  const [productosDisponibles, setProductosDisponibles] =
  useState<Producto[]>(productos)
  const [cargos, setCargos] = useState<
  { descripcion: string; importe: number }[]
>([])

  const [proveedorId, setProveedorId] = useState("")
  const [numero, setNumero] = useState("")
  const [fecha, setFecha] = useState("")
  const [fechaVencimiento, setFechaVencimiento] =
    useState("")

  const [leyendoIA, setLeyendoIA] =
    useState(false)

  const [errorIA, setErrorIA] =
    useState<string | null>(null)

  const [fallbackIA, setFallbackIA] =
  useState<{
    base64: string
    mimeType: string
    logId: string | null
    mensaje: string
  } | null>(null)

  const inputArchivoRef =
    useRef<HTMLInputElement>(null)

  const [pagarAlCargar, setPagarAlCargar] =
    useState(false)

  const [montoPago, setMontoPago] =
    useState(0)

  const [pagoTocado, setPagoTocado] =
    useState(false)

  const agregarLinea = () => {
    setLineas((prev) => [
      ...prev,
{
  producto_id: "",
  cantidad: 1,
  precio_unitario: 0,
  iva: 21,

  descuento: 0,

  precio_final: 0,
}
    ])
  }

  const quitarLinea = (index: number) => {
    setLineas((prev) =>
      prev.filter((_, i) => i !== index)
    )
  }

  const actualizarLinea = (
    index: number,
    campo: keyof LineaFactura,
    valor: string | number
  ) => {
    setLineas((prev) =>
      prev.map((linea, i) =>
        i === index
          ? {
              ...linea,
              [campo]: valor,
            }
          : linea
      )
    )
  }

  const actualizarProductoDeLinea = (
    index: number,
    productoId: string
  ) => {
    setLineas((prev) =>
      prev.map((linea, i) =>
        i === index
          ? {
              ...linea,
              producto_id: productoId,
            }
          : linea
      )
    )
  }
const crearProductoDesdeLinea = async (
  index: number,
  nombre: string,
  costo: number,
  iva: number
) => {
  const formData = new FormData()

  formData.set("nombre", nombre)
  formData.set("costo", String(costo))
  formData.set("iva", String(iva))

  const resultado =
    await crearProductoDesdeFactura(formData)

  if (!resultado.ok) {
    alert(resultado.error)

    // Si ya existía, lo agregamos igualmente
    // a la lista y lo seleccionamos.
    if (resultado.producto) {
      setProductosDisponibles((prev) => {
        if (
          prev.some(
            (producto) =>
              producto.id === resultado.producto!.id
          )
        ) {
          return prev
        }

        return [
          ...prev,
          resultado.producto!,
        ]
      })

      actualizarProductoDeLinea(
        index,
        resultado.producto.id
      )
    }

    return
  }

  if (resultado.producto) {
    setProductosDisponibles((prev) => [
      ...prev,
      resultado.producto!,
    ])

    actualizarProductoDeLinea(
      index,
      resultado.producto.id
    )
  }
}
const {
  subtotal,
  descuentos,
  iva,
  total,
} = useMemo(() => {

  let subtotalBruto = 0
  let descuentosTotal = 0
  let ivaTotal = 0

  // -----------------------------------------
  // 1. Calcular cada línea
  // -----------------------------------------

  lineas.forEach((linea) => {

    const cantidad =
      Number(linea.cantidad ?? 0)

    const precioUnitario =
      Number(linea.precio_unitario ?? 0)

    const bruto =
      cantidad * precioUnitario

    const descuentoLinea =
      Math.abs(
        Number(linea.descuento ?? 0)
      )

    // Neto real de esta línea
    const netoLinea =
      Math.max(
        0,
        bruto - descuentoLinea
      )

    subtotalBruto += bruto

    descuentosTotal += descuentoLinea

    // ---------------------------------------
    // IVA de la línea
    // ---------------------------------------

    const ivaLinea =
      Number(linea.iva ?? 0)

    const tasaIVA =
      ivaLinea === 21 ||
      ivaLinea === 10.5 ||
      ivaLinea === 0
        ? ivaLinea
        : ivaLinea > 100
          ? ivaLinea / 100
          : 0

    ivaTotal +=
      netoLinea *
      (tasaIVA / 100)
  })

  // -----------------------------------------
  // 2. Subtotal neto
  // -----------------------------------------

  const subtotalNeto =
    Math.max(
      0,
      subtotalBruto - descuentosTotal
    )

  // -----------------------------------------
  // 3. Otros cargos
  // -----------------------------------------

  const totalCargos =
    cargos.reduce(
      (acumulado, cargo) =>
        acumulado +
        Math.abs(
          Number(cargo.importe ?? 0)
        ),
      0
    )

  // -----------------------------------------
  // 4. Total final
  // -----------------------------------------

  const ivaRedondeado =
    Number(
      ivaTotal.toFixed(2)
    )

  const totalCalculado =
    subtotalNeto +
    ivaRedondeado +
    totalCargos

  return {
    subtotal:
      Number(
        subtotalNeto.toFixed(2)
      ),

    descuentos:
      Number(
        descuentosTotal.toFixed(2)
      ),

    iva:
      ivaRedondeado,

    total:
      Number(
        totalCalculado.toFixed(2)
      ),
  }

}, [lineas, cargos])

const montoPagoMostrado =
  pagoTocado
    ? Number(montoPago.toFixed(2))
    : total

  const archivoABase64 = (
    file: File
  ): Promise<string> =>
    new Promise((resolve, reject) => {

      const reader =
        new FileReader()

      reader.onload = () => {

        const resultado =
          reader.result as string

        resolve(
          resultado.split(",")[1] ?? ""
        )

      }

      reader.onerror = reject

      reader.readAsDataURL(file)

    })

async function aplicarDatosFacturaIA(
  datos: Awaited<ReturnType<typeof leerFacturaConIA>>
) {

  setCargos(
    (datos.cargos ?? []).map((cargo) => ({
      descripcion: cargo.descripcion,
      importe: Math.abs(
        Number(cargo.importe ?? 0)
      ),
    }))
  )

  // -----------------------------------------
  // Datos generales de la factura
  // -----------------------------------------

  if (datos.numero)
    setNumero(datos.numero)

  if (datos.fecha)
    setFecha(datos.fecha)

  if (datos.fecha_vencimiento)
    setFechaVencimiento(
      datos.fecha_vencimiento
    )

  // -----------------------------------------
  // Buscar proveedor detectado por IA
  // -----------------------------------------

  let proveedorDetectadoId =
    proveedorId

  if (datos.proveedor_nombre) {

    const nombreIA =
      datos.proveedor_nombre
        .toLowerCase()
        .trim()

    const proveedorEncontrado =
      proveedores.find((proveedor) =>
        proveedor.nombre_fantasia
          .toLowerCase()
          .trim()
          .includes(nombreIA)
        ||
        nombreIA.includes(
          proveedor.nombre_fantasia
            .toLowerCase()
            .trim()
        )
      )

    if (proveedorEncontrado) {

      proveedorDetectadoId =
        proveedorEncontrado.id

      setProveedorId(
        proveedorEncontrado.id
      )
    }
  }

  // -----------------------------------------
  // Procesar productos con IA
  // -----------------------------------------

  if (datos.lineas.length > 0) {

    const lineasProcesadas =
      await procesarLineasFacturaConIA(
        proveedorDetectadoId || null,
        datos.lineas,
        productos.map((producto) => ({
          id: producto.id,
          nombre: producto.nombre,
        }))
      )

    setLineas(
      lineasProcesadas
    )
  }
}

async function manejarArchivoIA(
  file: File
) {

  setLeyendoIA(true)
  setErrorIA(null)
  setFallbackIA(null)

  try {

    const base64 =
      await archivoABase64(file)

    const datos =
      await leerFacturaConIA(
        base64,
        file.type
      )

    await aplicarDatosFacturaIA(
      datos
    )

  } catch (error) {

    const mensaje =
      error instanceof Error
        ? error.message
        : "No se pudo leer la factura."

    if (
      mensaje.startsWith(
        "GEMINI_FALLBACK_REQUIRED|"
      )
    ) {

      const partes =
        mensaje.split("|")

      const logId =
        partes[1] || null

      const motivo =
        partes.slice(2).join("|") ||
        "Gemini no pudo procesar el documento."

      try {

        const base64 =
          await archivoABase64(file)

        setFallbackIA({
          base64,
          mimeType: file.type,
          logId,
          mensaje: motivo,
        })

        setErrorIA(null)

      } catch {

        setErrorIA(
          "No se pudo preparar el documento para el procesamiento alternativo."
        )
      }

    } else {

      setErrorIA(mensaje)
    }

  } finally {

    setLeyendoIA(false)

    if (inputArchivoRef.current) {
      inputArchivoRef.current.value = ""
    }
  }
}

async function autorizarOCR() {

  if (!fallbackIA)
    return

  setLeyendoIA(true)
  setErrorIA(null)

  try {

    const datos =
      await usarOCRParaFactura(
        fallbackIA.base64,
        fallbackIA.mimeType,
        fallbackIA.logId
      )

    await aplicarDatosFacturaIA(
      datos
    )

    setFallbackIA(null)

  } catch (error) {

    setErrorIA(
      error instanceof Error
        ? error.message
        : "No se pudo procesar el documento con OCR.space."
    )

  } finally {

    setLeyendoIA(false)
  }
}
    return (
    <form
      action={crearFactura}
      className="space-y-6"
    >
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(lineas)}
      />

      <input
        type="hidden"
        name="subtotal"
        value={subtotal}
      />

      <input
        type="hidden"
        name="iva"
        value={iva}
      />

      <input
        type="hidden"
        name="total"
        value={total}
      />

<CargaIA
  inputArchivoRef={inputArchivoRef}
  leyendoIA={leyendoIA}
  errorIA={errorIA}
  manejarArchivoIA={manejarArchivoIA}
/>

{fallbackIA && (
  <div className="rounded-xl border border-amber-300 bg-amber-50 p-5">

    <div className="mb-3">
      <h3 className="text-base font-semibold text-amber-900">
        ⚠️ Gemini no pudo procesar el documento
      </h3>

      <p className="mt-1 text-sm text-amber-800">
        {fallbackIA.mensaje}
      </p>
    </div>

    <p className="mb-4 text-sm text-gray-700">
      Podés intentar procesarlo con
      <strong> OCR.space</strong> como alternativa.
    </p>

    <div className="flex gap-3">

      <button
        type="button"
        onClick={autorizarOCR}
        disabled={leyendoIA}
        className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {leyendoIA
          ? "Procesando con OCR..."
          : "Usar OCR.space"}
      </button>

      <button
        type="button"
        onClick={() => {
          setFallbackIA(null)
          setErrorIA(null)
        }}
        disabled={leyendoIA}
        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
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
        setFechaVencimiento={
          setFechaVencimiento
        }
      />

<ProductosFactura
  productos={productosDisponibles}
  lineas={lineas}
  agregarLinea={agregarLinea}
  quitarLinea={quitarLinea}
  actualizarLinea={actualizarLinea}
  actualizarProductoDeLinea={
    actualizarProductoDeLinea
  }
  crearProductoDesdeLinea={
    crearProductoDesdeLinea
  }
/>

        <ImpuestosFactura
        subtotal={subtotal}
        descuentos={descuentos}
        iva={iva}
        cargos={cargos}
        total={total}
      />

      <PagoFactura
        pagarAlCargar={pagarAlCargar}
        setPagarAlCargar={
          setPagarAlCargar
        }
        montoPagoMostrado={
          montoPagoMostrado
        }
        setMontoPago={setMontoPago}
        setPagoTocado={setPagoTocado}
        total={total}
        formasPago={formasPago}
      />

      <button
        type="submit"
        disabled={
          lineas.length === 0
        }
        className="rounded-lg bg-black px-5 py-2 text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Guardar factura
      </button>
    </form>
  )
}