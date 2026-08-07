'use client'

import { useMemo, useRef, useState } from "react"

import { crearFactura } from "./actions"

import CargaIA from "./components/CargaIA"
import DatosComprobante from "./components/DatosComprobante"
import ProductosFactura, {
  LineaFactura,
} from "./components/ProductosFactura"
import ImpuestosFactura from "./components/ImpuestosFactura"
import PagoFactura from "./components/PagoFactura"

import { leerFacturaConIA } from "@/lib/ai/actions"


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

  const [proveedorId, setProveedorId] = useState("")
  const [numero, setNumero] = useState("")
  const [fecha, setFecha] = useState("")
  const [fechaVencimiento, setFechaVencimiento] =
    useState("")

  const [leyendoIA, setLeyendoIA] =
    useState(false)

  const [errorIA, setErrorIA] =
    useState<string | null>(null)

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

  const {
    subtotal,
    iva,
    total,
  } = useMemo(() => {

    let subtotal = 0
    let ivaTotal = 0

    lineas.forEach((linea) => {

      const importe =
        linea.cantidad *
        linea.precio_unitario

      subtotal += importe

      ivaTotal +=
        importe *
        (linea.iva / 100)

    })

    return {
      subtotal,
      iva: ivaTotal,
      total: subtotal + ivaTotal,
    }

  }, [lineas])

  const montoPagoMostrado =
    pagoTocado
      ? montoPago
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

  async function manejarArchivoIA(
    file: File
  ) {

    setLeyendoIA(true)
    setErrorIA(null)

    try {

      const base64 =
        await archivoABase64(file)

      const datos =
        await leerFacturaConIA(
          base64,
          file.type
        )

      if (datos.numero)
        setNumero(datos.numero)

      if (datos.fecha)
        setFecha(datos.fecha)

      if (datos.fecha_vencimiento)
        setFechaVencimiento(
          datos.fecha_vencimiento
        )

      if (datos.lineas.length > 0) {

setLineas(

  datos.lineas.map((l) => {

    const cantidad = l.cantidad || 1

    const precio = l.precio_unitario || 0

    const porcentajeIVA = l.iva ?? 21

    const subtotal = cantidad * precio

    const importeIVA =
      subtotal * (porcentajeIVA / 100)

    return {

      producto_id: "",

      cantidad,

      precio_unitario: precio,

      iva: porcentajeIVA,

      descuento: 0,

      precio_final:
        subtotal + importeIVA,

      descripcionLeida:
        l.descripcion,

      autoMatcheado: false,

    }

  })

)
      }
    } catch (error) {

      setErrorIA(
        error instanceof Error
          ? error.message
          : "No se pudo leer la factura."
      )

    } finally {

      setLeyendoIA(false)

      if (inputArchivoRef.current) {
        inputArchivoRef.current.value = ""
      }

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
        productos={productos}
        lineas={lineas}
        agregarLinea={agregarLinea}
        quitarLinea={quitarLinea}
        actualizarLinea={actualizarLinea}
        actualizarProductoDeLinea={
          actualizarProductoDeLinea
        }
      />

      <ImpuestosFactura
        subtotal={subtotal}
        iva={iva}
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