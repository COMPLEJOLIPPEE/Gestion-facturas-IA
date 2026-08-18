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

  // -----------------------------------------
  // 1. Neto bruto de productos
  // -----------------------------------------

  lineas.forEach((linea) => {

    const bruto =
      Number(linea.cantidad ?? 0) *
      Number(linea.precio_unitario ?? 0)

    subtotalBruto += bruto

    descuentosTotal +=
      Math.abs(Number(linea.descuento ?? 0))
  })

  // -----------------------------------------
  // 2. Neto después de descuentos
  // -----------------------------------------

  const subtotalNeto =
    Math.max(
      0,
      subtotalBruto - descuentosTotal
    )

  // -----------------------------------------
  // 3. IVA
  //
  // Si los descuentos están cargados
  // directamente en las líneas, se respetan.
  //
  // Si el descuento es global/por segmento,
  // se distribuye proporcionalmente entre
  // las líneas según su valor bruto.
  // -----------------------------------------

  let ivaTotal = 0

  lineas.forEach((linea) => {

    const bruto =
      Number(linea.cantidad ?? 0) *
      Number(linea.precio_unitario ?? 0)

    if (bruto <= 0) return

    const descuentoLinea =
      Math.abs(Number(linea.descuento ?? 0))

    let descuentoAplicado =
      descuentoLinea

    // Si la línea no tiene descuento propio,
    // distribuimos proporcionalmente el descuento
    // global/por segmento.
    if (
      descuentoAplicado === 0 &&
      subtotalBruto > 0 &&
      descuentosTotal > 0
    ) {
      descuentoAplicado =
        descuentosTotal *
        (bruto / subtotalBruto)
    }

    const netoLinea =
      Math.max(
        0,
        bruto - descuentoAplicado
      )

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
  // 4. Otros cargos / percepciones
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
  // 5. Total final
  // -----------------------------------------

  const totalCalculado =
    subtotalNeto +
    ivaTotal +
    totalCargos

  return {
    // Mostramos el neto después de descuentos
    subtotal: subtotalNeto,

    descuentos: descuentosTotal,

    iva: Number(
      ivaTotal.toFixed(2)
    ),

    total: Number(
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
setCargos(
  (datos.cargos ?? []).map((cargo) => ({
    descripcion: cargo.descripcion,
    importe: Math.abs(Number(cargo.importe ?? 0)),
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

    if (
      datos.lineas.length > 0 &&
      proveedorDetectadoId
    ) {

      const lineasProcesadas =
        await procesarLineasFacturaConIA(
          proveedorDetectadoId,
          datos.lineas,
          productos.map((producto) => ({
            id: producto.id,
            nombre: producto.nombre,
          }))
        )

      setLineas(
        lineasProcesadas
      )

    } else {

      // Si no encontramos proveedor,
      // mostramos igualmente las líneas
      // pero sin matching automático.

setLineas(
  datos.lineas.map((l) => ({
    producto_id: "",
    cantidad: l.cantidad || 1,
    precio_unitario: l.precio_unitario || 0,
    iva: l.iva ?? 21,

    descuento: l.descuento ?? 0,

    precio_final:
      l.precio_final ??
      Math.max(
        0,
        (l.cantidad || 1) *
          (l.precio_unitario || 0) -
          (l.descuento ?? 0)
      ),

    codigo_proveedor:
      l.codigo_proveedor ?? undefined,

    descripcionLeida:
      l.descripcion,

    autoMatcheado:
      false,
  }))
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